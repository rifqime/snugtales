import React, { useState } from 'react';
import { useRouter } from 'next/router';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from '../styles/CreateStory.module.css';

interface StoryPage {
  page_number: number;
  story_text: string;
  image_prompt: string;
  parent_interaction?: string;
  image_url?: string;
}

interface GeneratedStory {
  title: string;
  story: StoryPage[];
  summary: string;
  values_explored: string[];
}

export default function CreateStory() {
  const router = useRouter();
  const [storyInput, setStoryInput] = useState({
    childName: '',
    childAge: '',
    storyTheme: '',
    parentValue: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoryInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyInput),
      });

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      const data: GeneratedStory = await response.json();

      // Save the story to localStorage
      localStorage.setItem('lastGeneratedStory', JSON.stringify(data));

      // Navigate to the story page
      router.push('/story');
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to generate story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create Your Magical Story</h1>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          name="childName"
          value={storyInput.childName}
          onChange={handleInputChange}
          placeholder="Child's Name"
          required
          className={styles.input}
        />
        <input
          type="number"
          name="childAge"
          value={storyInput.childAge}
          onChange={handleInputChange}
          placeholder="Child's Age"
          required
          min="2"
          max="6"
          className={styles.input}
        />
        <input
          type="text"
          name="storyTheme"
          value={storyInput.storyTheme}
          onChange={handleInputChange}
          placeholder="Story Theme (e.g., adventure, friendship)"
          required
          className={styles.input}
        />
        <textarea
          name="parentValue"
          value={storyInput.parentValue}
          onChange={handleInputChange}
          placeholder="What value or lesson would you like to teach?"
          required
          className={styles.textarea}
        ></textarea>
        <button type="submit" className={styles.button}>Create Story</button>
      </form>
    </div>
  );
}