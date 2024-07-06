// setupDatabase.js

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db'); // This creates a new file-based database called 'database.db'

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      title TEXT,
      story TEXT,
      summary TEXT,
      values_explored TEXT
    )
  `);
});

db.close();