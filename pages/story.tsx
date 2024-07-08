import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Story.module.css';
import { supabase } from '../lib/supabaseClient';

interface StoryPage {
  page_number: number;
  story_text: string;
  image_prompt: string;
  parent_interaction?: string;
  image_url?: string;
}

interface GeneratedStory {
  id: string;
  title: string;
  story: StoryPage[];
  summary: string;
  values_explored: string[];
}

export default function StoryPage() {
  const router = useRouter();
  const { id } = router.query;
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    async function fetchStory(storyId: string) {
      try {
        setIsLoading(true);
        setError(null);
        console.log(`Fetching story with ID: ${storyId}`);

        const { data, error } = await supabase
          .from('stories')
          .select('*')
          .eq('id', storyId)
          .single();

        if (error) throw error;

        if (data) {
          console.log('Story data fetched successfully:', data);
          setStory(data as GeneratedStory);
        } else {
          throw new Error('Story not found');
        }
      } catch (err) {
        console.error('Error fetching story:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    if (id && typeof id === 'string') {
      fetchStory(id);
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const copyToClipboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess('URL copied!');
      setTimeout(() => setCopySuccess(''), 2000); // Clear the message after 2 seconds
    }, (err) => {
      console.error('Could not copy text: ', err);
      setCopySuccess('Failed to copy');
    });
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        Error: {error}
        <Link href="/create-story">Create a new story</Link>
      </div>
    );
  }

  if (!story) {
    return (
      <div className={styles.error}>
        No story found. 
        <Link href="/create-story">Create a new story</Link>
      </div>
    );
  }

  return (
    <div className={styles.storyContainer}>
      <h1 className={styles.storyTitle}>{story.title}</h1>
      <div className={styles.storySummary}>
        <div className={styles.summaryContent}>
          <h2>Story Summary</h2>
          <p>{story.summary}</p>
          <div className={styles.valuesExplored}>
            <h3>Values Explored</h3>
            <ul>
              {story.values_explored.map((value, index) => (
                <li key={index}>{value}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {story.story.map((page, index) => (
        <div key={index} className={styles.storyPage}>
          <h2 className={styles.pageNumber}>Page {page.page_number}</h2>
          {page.image_url && (
            <div className={styles.imageContainer}>
              <img 
                src={page.image_url} 
                alt={`Illustration for page ${page.page_number}`} 
                className={styles.storyImage}
              />
            </div>
          )}
          <p className={styles.storyText}>{page.story_text}</p>
          {page.parent_interaction && (
            <div className={styles.parentInteraction}>
              <h3>Parent Interaction:</h3>
              <p>{page.parent_interaction}</p>
            </div>
          )}
        </div>
      ))}
      <div className={styles.buttonContainer}>
        <button onClick={copyToClipboard} className={styles.copyUrlButton}>
          Copy Story URL
        </button>
        {copySuccess && <span className={styles.copySuccess}>{copySuccess}</span>}
        <button onClick={() => router.push('/create-story')} className={styles.newStoryButton}>
          Create Another Story
        </button>
      </div>
    </div>
  );
}
