# SnugTales

SnugTales is an AI-powered bedtime story generator designed for children aged 2-6. It creates engaging, educational stories that instill values chosen by parents while being entertaining and age-appropriate.

## Features

- Generates custom bedtime stories based on child's name, age, and parent's chosen value
- Creates unique illustrations for each page of the story
- Aligns with Muslim values while being culturally sensitive and globally appealing
- Uses animals or parables as main characters by default
- Provides optional parent-child interaction suggestions
- Stores generated stories for future access
- Allows sharing of stories via unique URLs

## Tech Stack

- Next.js
- Anthropic's Claude AI for story generation
- Replicate for image generation
- Supabase for database and storage

## Getting Started

This is a proof of concept application. To run it locally:

1. Clone the repository
   ```
   git clone https://github.com/yourusername/snugtales.git
   cd snugtales
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env.local` file in the root directory and add your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_key_here
   REPLICATE_API_TOKEN=your_replicate_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up Supabase
   - Create a new project in Supabase
   - Create a `stories` table with the following columns:
     - id (UUID, primary key)
     - title (text)
     - story (jsonb)
     - summary (text)
     - values_explored (jsonb)
   - Create a `story-images` bucket in Supabase Storage
   - Make the `story-images` bucket public:
     - Go to Storage > Buckets
     - Click on the `story-images` bucket
     - In the "Policies" tab, click "New Policy"
     - Set up a policy to allow public read access:
       - Policy name: "Allow public read access"
       - For SQL Editor, use: `CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id = 'story-images');`
       - Click "Review" and then "Save policy"
   - Ensure your Supabase project's API settings allow requests from your application's domain (or set to `*` for development)

5. Run the development server
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Navigate to the homepage at http://localhost:3000
2. Click on "Start Your Story Journey"
3. Fill in the required information about the child and the story theme
4. Submit the form to generate a personalized bedtime story
5. View the generated story
6. Share the story using the provided unique URL

## Customization

The behavior of the app and the generated stories can be modified by editing the prompt sent to Anthropic's API. This can be done in the `pages/api/generate-story.ts` file.

## Contributing

As this is a proof of concept for a competition, we are not currently accepting contributions. However, feel free to fork the project and experiment with your own modifications.

## License

[MIT License](LICENSE)