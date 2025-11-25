const express = require('express');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

let transporter;

async function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // use Ethereal for dev testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Ethereal account', testAccount);
  }
  return transporter;
}

router.post('/signup', async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    // check if user exists
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const confirm_token = uuidv4();
    const insert = await db.query(
      'INSERT INTO users (email, password_hash, username, confirmed, confirm_token, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id,email,username',
      [email, hashed, username || null, false, confirm_token]
    );

    const user = insert.rows[0];

    // send confirmation email
    const t = await getTransporter();
    const confirmUrl = `${APP_URL}/auth/confirm?token=${confirm_token}`;
    const info = await t.sendMail({
      from: 'no-reply@alba.local',
      to: email,
      subject: 'Please confirm your email',
      text: `Click to confirm: ${confirmUrl}`,
      html: `<p>Click to confirm: <a href="${confirmUrl}">${confirmUrl}</a></p>`,
    });

    const preview = nodemailer.getTestMessageUrl(info);

    res.json({ user, previewUrl: preview });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/confirm', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  try {
    const { rows } = await db.query('SELECT id FROM users WHERE confirm_token = $1', [token]);
    if (!rows.length) return res.status(404).send('Invalid token');

    await db.query('UPDATE users SET confirmed = true, confirm_token = null WHERE id = $1', [rows[0].id]);
    res.send('Email confirmed. You can now login.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await db.query('SELECT id, password_hash, confirmed, username FROM users WHERE email = $1', [email]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!user.confirmed) return res.status(403).json({ error: 'Email not confirmed' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
