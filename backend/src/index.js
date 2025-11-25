require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const auth = require('./auth');
const db = require('./db');

app.use(express.json());
app.use('/auth', auth);

async function runMigrations() {
  // create users table if not exists
  const create = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT,
    confirmed BOOLEAN DEFAULT FALSE,
    confirm_token TEXT,
    created_at TIMESTAMP
  );
  `;
  await db.query(create);
  console.log('Migrations applied');
}

runMigrations().catch(err => {
  console.error('Migration error', err);
  process.exit(1);
});

app.get('/', (req, res) => res.send('Alba Auth backend is running'));

app.listen(port, () => console.log(`Auth backend listening on ${port}`));
