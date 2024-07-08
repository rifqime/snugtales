import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles/AllStories.module.css';

interface Story {
  id: string;
  title: string;
  summary: string;
  created_at: string;
}

export default function AllStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllStories() {
      try {
        setLoading(true);
        const response = await fetch('/api/generate-story?all=true');
        if (!response.ok) {
          throw new Error('Failed to fetch stories');
        }
        const data = await response.json();
        setStories(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stories:', error);
        setError('Failed to load stories. Please try again later.');
        setLoading(false);
      }
    }

    fetchAllStories();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>All Stories</h1>
      {stories.length > 0 ? (
        <ul className={styles.storyList}>
          {stories.map((story) => (
            <li key={story.id} className={styles.storyItem}>
              <Link href={`/story?id=${story.id}`}>
                <h2>{story.title}</h2>
                <p>{story.summary}</p>
                <small>{new Date(story.created_at).toLocaleDateString()}</small>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.noStories}>No stories available.</p>
      )}
      <Link href="/" className={styles.backLink}>
        Back to Home
      </Link>
    </div>
  );
}
