import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Story.module.css';
import { supabase } from '../lib/supabaseClient';
import { RefreshCw, Home } from 'lucide-react';

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
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [revisingPage, setRevisingPage] = useState<number | null>(null);

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
      setTimeout(() => setCopySuccess(''), 2000);
    }, (err) => {
      console.error('Could not copy text: ', err);
      setCopySuccess('Failed to copy');
    });
  };

  const handleRevisionRequest = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setRevisionModalOpen(true);
  };

  const handleRevisionSubmit = async () => {
    if (!story || currentPage === null) return;

    setRevisingPage(currentPage);
    setRevisionModalOpen(false);

    try {
      const response = await fetch('/api/revise-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: story.id,
          pageNumber: currentPage,
          originalPrompt: story.story[currentPage - 1].image_prompt,
          userFeedback,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revise image');
      }

      const { newImageUrl, refinedPrompt } = await response.json();

      setStory(prevStory => {
        if (!prevStory) return null;
        const updatedStory = {...prevStory};
        updatedStory.story = updatedStory.story.map(page => 
          page.page_number === currentPage ? {...page, image_url: newImageUrl, image_prompt: refinedPrompt} : page
        );
        return updatedStory;
      });
    } catch (err) {
      console.error('Error revising image:', err);
      setError('Failed to revise image. Please try again.');
    } finally {
      setRevisingPage(null);
      setUserFeedback('');
    }
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
      <Link href="/" className={styles.backHomeButton}>
        <Home size={24} />
        <span>Back to Home</span>
      </Link>

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
            <div className={styles.imageWrapper}>
              <div className={styles.imageContainer}>
                <Image 
                  src={page.image_url} 
                  alt={`Illustration for page ${page.page_number}`} 
                  layout="fill"
                  objectFit="cover"
                  className={styles.storyImage}
                />
                <button
                  onClick={() => handleRevisionRequest(page.page_number)}
                  disabled={revisingPage === page.page_number}
                  className={styles.reviseButton}
                  aria-label="Revise Image"
                >
                  <RefreshCw size={24} />
                </button>
              </div>
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

      {revisionModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Revise Image</h2>
            <p>Describe what you&apos;d like to change about the image.</p>
            <textarea
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              className={styles.feedbackInput}
            />
            <div className={styles.modalButtons}>
              <button onClick={() => setRevisionModalOpen(false)}>Cancel</button>
              <button onClick={handleRevisionSubmit}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}