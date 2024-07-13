import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

interface Story {
  id: string;
  title: string;
  summary: string;
  created_at: string;
}

export default function Home() {
  const [recentStories, setRecentStories] = useState<Story[]>([]);

  useEffect(() => {
    async function fetchRecentStories() {
      try {
        const response = await fetch('/api/generate-story?recent=true');
        if (!response.ok) {
          throw new Error('Failed to fetch recent stories');
        }
        const data = await response.json();
        // Limit the number of stories to 5
        setRecentStories(data.slice(0, 5));
      } catch (error) {
        console.error('Error fetching recent stories:', error);
      }
    }

    fetchRecentStories();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Image 
          src="/SnugTales-400px.png" 
          alt="SnugTales.com - Strengthen Your Bond, One Bedtime Story at a Time" 
          width={400}
          height={100}
          style={{
            width: 'auto',
            height: 'auto',
          }}
        />
        <h1 className={styles.hiddenText}>SnugTales.com</h1>
        <p className={styles.hiddenText}>Strengthen Your Bond, One Bedtime Story at a Time</p>
      </header>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h2>Create Magical Moments Every Night</h2>
            <p>
              Snugtales helps you craft personalized bedtime stories that captivate your child&apos;s imagination and bring you closer together. No more struggling to come up with new stories – let your creativity flow with our easy-to-use story creator.
            </p>
            <Link href="/create-story" className={styles.button}>
              Start Your Story Journey
            </Link>
          </div>
          <div className={styles.heroImage}>
            <Image 
              src="/hero-image.png" 
              alt="Parent reading to child" 
              width={1028}
              height={774}
              style={{
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
        </section>
        <section className={styles.recentStories}>
          <h2>Recent Stories</h2>
          {recentStories.length > 0 ? (
            <>
              <ul className={styles.storyList}>
                {recentStories.map((story) => (
                  <li key={story.id} className={styles.storyItem}>
                    <Link href={`/story?id=${story.id}`}>
                      <h3>{story.title}</h3>
                      <p>{story.summary}</p>
                      <small>{new Date(story.created_at).toLocaleDateString()}</small>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={styles.viewAllContainer}>
                <Link href="/all-stories" className={styles.button}>
                  View All Stories
                </Link>
              </div>
            </>
          ) : (
            <p>No recent stories available.</p>
          )}
        </section>
        <section className={styles.features}>
          <h2>Why Parents Love Snugtales</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.icon}>❤️</div>
              <h3>Strengthen Your Bond</h3>
              <p>Create precious moments that last a lifetime. Our stories bring you and your child closer together.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.icon}>📚</div>
              <h3>Personalized Adventures</h3>
              <p>Every story is unique, featuring your child&apos;s name and tailored to their interests and age.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.icon}>🌙</div>
              <h3>Peaceful Bedtimes</h3>
              <p>Transform bedtime struggles into eagerly anticipated story time with engaging tales.</p>
            </div>
          </div>
        </section>
        <section className={styles.howItWorks}>
          <h2>How It Works</h2>
          <ol className={styles.steps}>
            <li>Enter your child&apos;s name, age, and interests</li>
            <li>Choose a theme or value you&apos;d like to explore</li>
            <li>Add any special elements or ideas you have</li>
            <li>Generate your unique story in seconds</li>
            <li>Enjoy a magical bedtime experience with your child</li>
          </ol>
        </section>
        <section className={styles.cta}>
          <h2>Ready to Create Unforgettable Stories?</h2>
          <Link href="/create-story" className={styles.button}>
            Begin Your Storytelling Adventure
          </Link>
        </section>
      </main>
    </div>
  );
}