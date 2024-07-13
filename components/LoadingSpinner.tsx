import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from '../styles/LoadingSpinner.module.css';

const LoadingSpinner: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => (prevProgress < 100 ? prevProgress + 1 : 100));
    }, 1800); // 1800ms for 3 minutes (180 seconds total)

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner}>
        <Image 
          src="/SnugTales-Square-512.png" 
          alt="SnugTales loading image"
          width={400} // Increase size
          height={400} // Increase size
          layout="responsive"
        />
      </div>
      <p className={styles.spinnerText}>Creating your magical story... This will take about 2-3 minutes, please wait.</p>
      <div className={styles.progressBar}>
        <div className={styles.progress} style={{ width: `${progress}%` }}></div>
      </div>
      <p className={styles.progressText}>{progress}% completed</p>
    </div>
  );
};

export default LoadingSpinner;