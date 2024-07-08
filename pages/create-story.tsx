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
  id: string;  // Add this line to include the id in the interface
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

      if (!data.id) {
        throw new Error('Story ID not received from server');
      }

      // Navigate to the story page with the ID as a query parameter
      router.push(`/story?id=${data.id}`);
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
        <div className={styles.inputGroup}>
          <label htmlFor="childName" className={styles.label}>Child&apos;s Name</label>
          <input
            type="text"
            name="childName"
            id="childName"
            value={storyInput.childName}
            onChange={handleInputChange}
            placeholder="E.g., John"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="childAge" className={styles.label}>Child&apos;s Age</label>
          <input
            type="number"
            name="childAge"
            id="childAge"
            value={storyInput.childAge}
            onChange={handleInputChange}
            placeholder="E.g., 5"
            required
            min="2"
            max="6"
            className={styles.input}
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="storyTheme" className={styles.label}>Story Theme</label>
          <input
            type="text"
            name="storyTheme"
            id="storyTheme"
            value={storyInput.storyTheme}
            onChange={handleInputChange}
            placeholder="E.g., funny, adventure, friendship, animal"
            required
            className={styles.input}
          />
          <p className={styles.helperText}>Choose a theme that will guide the overall tone of the story.</p>
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="parentValue" className={styles.label}>Story Details and Values</label>
          <textarea
            name="parentValue"
            id="parentValue"
            value={storyInput.parentValue}
            onChange={handleInputChange}
            placeholder="Provide details: characters, settings, storyline, and the lesson or value to teach. The more details, the better the story! You can also specify your preferred language."
            required
            className={styles.textarea}
          ></textarea>
          <p className={styles.helperText}>Include as many details as possible about the story&apos;s characters, setting, and plot. Also, specify any particular values or lessons you want the story to convey.</p>
        </div>
        <button type="submit" className={styles.button}>Create Story</button>
        <p className={styles.disclaimer}>Note: Our AI is full of surprises! Enjoy the unique touches in your story and images.</p>
      </form>
    </div>
  );
}
