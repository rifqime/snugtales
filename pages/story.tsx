import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Story.module.css';

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

  useEffect(() => {
    if (id) {
      console.log(`Fetching story with ID: ${id}`);
      fetch(`/api/generate-story?id=${id}`)
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            console.error(`Error: ${data.error}`);
            router.push('/create-story');
          } else {
            console.log('Story data fetched successfully:', data);
            setStory(data);
          }
        })
        .catch(error => {
          console.error('Error fetching story:', error);
          router.push('/create-story');
        });
    } else {
      console.log('No ID found in URL, attempting to load from local storage');
      const savedStory = localStorage.getItem('lastGeneratedStory');
      if (savedStory) {
        const parsedStory = JSON.parse(savedStory);
        setStory(parsedStory);
        console.log(`Loaded story from local storage with ID: ${parsedStory.id}`);
        // Update URL with story ID
        router.push(`/story?id=${parsedStory.id}`, undefined, { shallow: true });
      } else {
        console.log('No story found in local storage, redirecting to create story page');
        router.push('/create-story');
      }
    }
  }, [id, router]);

  if (!story) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.storyContainer}>
      <h1 className={styles.storyTitle}>{story.title}</h1>
      <div className={`${styles.storySummary} ${styles.storySummarySpacing}`}>
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
          {page.image_url && <img src={page.image_url} alt={`Illustration for page ${page.page_number}`} className={styles.storyImage} />}
          <p className={styles.storyText}>{page.story_text}</p>
          {page.parent_interaction && (
            <div className={styles.parentInteraction}>
              <h3>Parent Interaction:</h3>
              <p>{page.parent_interaction}</p>
            </div>
          )}
        </div>
      ))}
      <button onClick={() => router.push('/create-story')} className={styles.newStoryButton}>Create Another Story</button>
    </div>
  );
}