import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { supabase } from '../../lib/supabaseClient';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

interface StoryPage {
  page_number: number;
  story_text: string;
  image_prompt: string;
  parent_interaction: string | null;
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
        contentType: 'image/webp',
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

async function generateStoryContent(childName: string, childAge: string, parentName: string, parentValue: string, favoriteAnimal: string): Promise<StoryData> {
  const systemPrompt = `You are an AI-powered bedtime story creator for children aged 2-6. Create engaging, educational stories that instill values and ideas chosen by parents aligning with Muslim values, while being entertaining and age-appropriate. Guidelines:
    1. Generate a complete 8-10 page bedtime story with text, image prompt, and optional parent interaction per page.
    2. Tailor content to the child's age.
    3. Integrate the parent's chosen value naturally.
    4. Use engagement techniques like repetition, rhymes, and mild suspense.
    5. Ensure cultural sensitivity and global appeal.
    6. Maintain consistent image style across illustrations.
    7. Use parables or animals as main characters by default.
    8. Only use child's name as character if requested; don't render child's image unless specified.
    9. Keep visual design consistent for main characters across all panels.`;

  const userMessage = `Create a bedtime story with:
    - Child's name: ${childName}
    - Child's age: ${childAge}
    - Parent's name: ${parentName || 'Not provided'}
    - Value to share: ${parentValue}
    - Favorite animal: ${favoriteAnimal || 'Not provided'}

    Image Prompt Template:
    "Simple, flat color children's book illustration. [Main character description] is [action]. Background: [setting]. Style: soft watercolor, delicate lines, warm muted tones. Characters have expressive eyes and rounded features. Include a small ${favoriteAnimal} if relevant. Use pastel palette. Round, chubby appearance for all elements. Culturally sensitive, appealing to young children."

    Format response as JSON:
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

    Ensure JSON is properly formatted and maintain character consistency across image prompts.`;

  console.log('Sending prompt to Anthropic');

  try {
    const storyResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 3500,
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
      const output = await replicate.run(
        "fofr/sd3-explorer:a9f4aebd943ad7db13de8e34debea359d5578d08f128e968f9a36c3e9b0148d4", 
        { input: { prompt: page.image_prompt, guidance_scale: 4.5 } }
      );

      if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
        const fileName = `story_${Date.now()}_page_${index + 1}.webp`;
        console.log(`Saving image for page ${index + 1}`);
        const persistentUrl = await saveImageToStorage(output[0], fileName);
        console.log(`Image saved for page ${index + 1}: ${persistentUrl}`);
        return { ...page, image_url: persistentUrl };
      }
      throw new Error('Invalid output from Replicate');
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
      const { childName, childAge, parentName, parentValue, favoriteAnimal } = req.body;

      console.log('Generating story content');
      const storyData = await generateStoryContent(childName, childAge, parentName, parentValue, favoriteAnimal);

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
