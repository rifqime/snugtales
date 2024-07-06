import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';
import Replicate from 'replicate';

// Initialize clients and database
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const replicate = new Replicate();
const db = new sqlite3.Database('./database.db');

// Create stories table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT,
  story TEXT,
  summary TEXT,
  values_explored TEXT
)`);

// Define interfaces
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

interface DBStory {
  id: string;
  title: string;
  story: string;
  summary: string;
  values_explored: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { childName, childAge, parentName, parentValue, favoriteAnimal } = req.body;

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

      const storyResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      console.log('Received response from Anthropic');

      let storyData: StoryData;
      try {
        const textContent = storyResponse.content.find((block) => block.type === 'text');
        if (!textContent || typeof textContent.text !== 'string') {
          throw new Error('No valid text content in the response');
        }
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          storyData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON object found in the response');
        }
      } catch (error) {
        console.error('Failed to parse AI response:', error);
        throw new Error('Invalid response from AI');
      }

      // Generate images with Replicate
      const imagePromises = storyData.story.map(async (page) => {
        try {
          const output = await replicate.run(
            "fofr/sd3-explorer:a9f4aebd943ad7db13de8e34debea359d5578d08f128e968f9a36c3e9b0148d4", 
            { input: { prompt: page.image_prompt, guidance_scale: 4.5 } }
          );
          return output[0];
        } catch (error) {
          console.error('Error generating image:', error);
          return null;
        }
      });

      const images = await Promise.all(imagePromises);

      const storyId = uuidv4();
      const finalStoryData: StoryData = {
        id: storyId,
        ...storyData,
        story: storyData.story.map((page, index) => ({
          ...page,
          image_url: images[index] || undefined,
        })),
      };

      // Save the story to the SQLite database
      await new Promise<void>((resolve, reject) => {
        const stmt = db.prepare("INSERT INTO stories (id, title, story, summary, values_explored) VALUES (?, ?, ?, ?, ?)");
        stmt.run(
          storyId,
          finalStoryData.title,
          JSON.stringify(finalStoryData.story),
          finalStoryData.summary,
          JSON.stringify(finalStoryData.values_explored),
          (err: Error | null) => err ? reject(err) : resolve()
        );
        stmt.finalize();
      });

      res.status(200).json(finalStoryData);

    } catch (error) {
      console.error('Error generating story:', error);
      res.status(500).json({ error: 'Failed to generate story' });
    }
  } else if (req.method === 'GET') {
    const { id } = req.query;

    if (id && typeof id === 'string') {
      // Retrieve a specific story
      db.get("SELECT * FROM stories WHERE id = ?", [id], (err, row: DBStory | undefined) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Failed to retrieve story' });
        } else if (row) {
          try {
            const storyData: StoryData = {
              id: row.id,
              title: row.title,
              story: JSON.parse(row.story),
              summary: row.summary,
              values_explored: JSON.parse(row.values_explored),
            };
            res.status(200).json(storyData);
          } catch (parseError) {
            console.error('Error parsing story data:', parseError);
            res.status(500).json({ error: 'Failed to parse story data' });
          }
        } else {
          res.status(404).json({ error: 'Story not found' });
        }
      });
    } else {
      // Retrieve all stories
      db.all("SELECT * FROM stories", (err, rows: DBStory[]) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Failed to retrieve stories' });
        } else {
          try {
            const stories = rows.map((row) => ({
              id: row.id,
              title: row.title,
              summary: row.summary,
              values_explored: JSON.parse(row.values_explored),
            }));
            res.status(200).json(stories);
          } catch (parseError) {
            console.error('Error parsing stories data:', parseError);
            res.status(500).json({ error: 'Failed to parse stories data' });
          }
        }
      });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}