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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { storyId, pageNumber, originalPrompt, userFeedback } = req.body;

    try {
      // Refine the prompt using Claude
      const refinedPromptResponse = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        system: "You are an AI assistant specializing in refining image generation prompts. Your task is to take an original prompt and user feedback, then create an improved prompt that addresses the user's concerns while maintaining the original intent and style.",
        messages: [{ role: "user", content: `Original prompt: "${originalPrompt}"

User feedback: "${userFeedback}"

Please provide a refined prompt that addresses the user's feedback while maintaining the original intent and style of the image description. The refined prompt should be suitable for use with an AI image generation model. Ensure the refined prompt maintains the cute, simple children's illustration style with soft watercolors and simple shapes, appropriate for young children.` }],
      });

      const refinedPrompt = refinedPromptResponse.content[0].type === 'text' 
        ? refinedPromptResponse.content[0].text 
        : '';

      if (!refinedPrompt) {
        throw new Error('Failed to generate refined prompt');
      }

      // Generate new image using fal.ai with the refined prompt
      const result = await fal.subscribe("fal-ai/aura-flow", {
        input: {
          prompt: refinedPrompt,
          num_images: 1,
          guidance_scale: 3.5,
          num_inference_steps: 25
        },
      }) as FalResult;

      if (!result.images || result.images.length === 0) {
        throw new Error('No image generated from fal.ai/aura-flow');
      }

      // Save the new image
      const fileName = `story_${storyId}_page_${pageNumber}_${Date.now()}.png`;
      const newImageUrl = await saveImageToStorage(result.images[0].url, fileName);

      // Update the story in the database
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (storyError) throw storyError;

      const updatedStory = {
        ...story,
        story: story.story.map((p: any) => 
          p.page_number === pageNumber ? {...p, image_url: newImageUrl, image_prompt: refinedPrompt} : p
        )
      };

      const { error: updateError } = await supabase
        .from('stories')
        .update(updatedStory)
        .eq('id', storyId);

      if (updateError) throw updateError;

      res.status(200).json({ newImageUrl, refinedPrompt });
    } catch (error) {
      console.error('Error revising image:', error);
      res.status(500).json({ error: 'Failed to revise image' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}