import React from 'react';
import styles from '../styles/LoadingSpinner.module.css';

const LoadingSpinner: React.FC = () => (
  <div className={styles.spinnerContainer}>
    <div className={styles.spinner}></div>
    <p>Creating your magical story...</p>
  </div>
);

export default LoadingSpinner;