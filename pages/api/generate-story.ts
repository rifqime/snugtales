import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import * as fal from "@fal-ai/serverless-client";
import { supabase } from '../../lib/supabaseClient';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Ensure FAL_KEY is set
if (!process.env.FAL_KEY) {
  throw new Error("FAL_KEY is not set in environment variables");
}

fal.config({
  credentials: process.env.FAL_KEY
});

// Add this type definition
type FalResult = {
  images?: Array<{ url: string }>;
};

interface StoryPage {
  page_number: number;
  story_text: string;
  image_prompt: string;
  parent_interaction?: string;
  image_url?: string;
}

interface StoryData {
  id?: string;
  title: string;
  story: StoryPage[];
  summary: string;
  values_explored: string[];
}

async function saveImageToStorage(imageUrl: string, fileName: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('story-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    console.log('File uploaded successfully:', data);

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/story-images/${fileName}`;
    console.log('Constructed public URL:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('Error in saveImageToStorage:', error);
    throw error;
  }
}

async function generateStoryContent(childName: string, childAge: string, storyTheme: string, parentValue: string): Promise<StoryData> {
  const systemPrompt = `You are an AI-powered bedtime story creator for children aged 2-6. Create engaging, educational stories that instill values and ideas chosen by parents, while being entertaining and age-appropriate. Guidelines:
  1. Generate a complete 8-10 page bedtime story with text and image prompt for each page.
  2. Based on the input provided, decide whether to use the child as a character or create a story with fictional characters that align with the given theme.
  3. Tailor the content to the child's age and incorporate the parent's chosen values and story details naturally.
  4. Use engagement techniques like repetition, rhymes, and mild suspense.
  5. Ensure cultural sensitivity and global appeal.
  6. Maintain consistent character appearances and style across all pages.
  7. Create vivid, colorful imagery suitable for young children.
  8. For each image prompt, provide a detailed and consistent description of main characters, including their appearance, clothing, and any distinguishing features.
  9. Ensure each image prompt can stand alone without relying on context from other images.`;

  const userMessage = `Create a bedtime story based on the following information:
  - Child's name: ${childName}
  - Child's age: ${childAge}
  - Story theme: ${storyTheme}
  - Story details and values: ${parentValue}

  For each page, provide:
  1. Story text
  2. An image prompt using this template:"Cute, simple children's illustration. [Character name], a [age]-year-old [boy/girl] with a round face, simple dot eyes, and a small smile. [He/She] has [hair description] and is wearing [clothing description]. [Action or situation]. Background: Simple, uncluttered [setting] with soft pastel colors. Style: Gentle watercolor effect with clean, simple outlines. Use a limited, pastel color palette. Characters should have rounded, cute features similar to child-friendly disney pixar character. Minimal details, focus on basic shapes. Include: [Any other important elements or secondary characters]. Soft, comforting, and appealing for children."
  3. An optional parent interaction suggestion (only where it adds value to the story experience)

  Ensure that the description of main characters remains consistent across all image prompts, and each prompt contains enough information to generate a coherent image without relying on other prompts.

  Format the response as JSON:
  {
    "title": "Story title",
    "story": [
      {
        "page_number": int,
        "story_text": "Story text for this page",
        "image_prompt": "Image prompt using the template",
        "parent_interaction": "Parent-child interaction suggestion or null"
      }
    ],
    "summary": "Brief story summary",
    "values_explored": ["Key values in the story"]
  }

  Ensure proper JSON formatting and maintain character consistency across all pages. Incorporate the story theme and parent's values throughout the narrative.`;

  console.log('Sending prompt to Anthropic');

  try {
    const storyResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    console.log('Received response from Anthropic');

    const textContent = storyResponse.content.find(block => block.type === 'text');
    if (!textContent || typeof textContent.text !== 'string') {
      throw new Error('No valid text content in the response');
    }
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON object found in the response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating story content:', error);
    throw error;
  }
}

async function generateAndSaveImages(story: StoryPage[]): Promise<StoryPage[]> {
  const imagePromises = story.map(async (page, index) => {
    try {
      console.log(`Generating image for page ${index + 1}`);
      const result = await fal.subscribe("fal-ai/aura-flow", {
        input: {
          prompt: page.image_prompt,
          num_images: 1,
          guidance_scale: 3.5,
          num_inference_steps: 25
        },
      }) as FalResult;

      if (result.images && result.images.length > 0) {
        const imageUrl = result.images[0].url;
        const fileName = `story_${Date.now()}_page_${index + 1}.png`;
        console.log(`Saving image for page ${index + 1}`);
        const persistentUrl = await saveImageToStorage(imageUrl, fileName);
        console.log(`Image saved for page ${index + 1}: ${persistentUrl}`);
        return { ...page, image_url: persistentUrl };
      }
      throw new Error('No image generated from fal.ai/aura-flow');
    } catch (error) {
      console.error(`Error generating or saving image for page ${index + 1}:`, error);
      return page;
    }
  });

  return Promise.all(imagePromises);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { childName, childAge, storyTheme, parentValue } = req.body;

      console.log('Generating story content');
      const storyData = await generateStoryContent(childName, childAge, storyTheme, parentValue);

      console.log('Generating and saving images');
      const storyWithImages = await generateAndSaveImages(storyData.story);

      const finalStoryData: StoryData = {
        ...storyData,
        story: storyWithImages,
      };

      console.log('Saving story to database');
      const { data, error } = await supabase
        .from('stories')
        .insert([finalStoryData])
        .select()

      if (error) throw error;

      console.log('Story saved successfully');

      // Add a delay to ensure the story is fully saved and propagated
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds delay

      res.status(200).json(data[0]);

    } catch (error) {
      console.error('Error generating story:', error);
      res.status(500).json({ error: 'Failed to generate story', details: error instanceof Error ? error.message : String(error) });
    }
  } else if (req.method === 'GET') {
    const { id } = req.query;

    if (id && typeof id === 'string') {
      console.log(`Fetching story with ID: ${id}`);
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve story' });
      } else if (data) {
        res.status(200).json(data);
      } else {
        res.status(404).json({ error: 'Story not found' });
      }
    } else {
      console.log('Fetching recent stories');
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, summary, values_explored')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve stories' });
      } else {
        res.status(200).json(data);
      }
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}