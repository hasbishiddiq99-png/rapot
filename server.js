require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const {
  DATABASE_URL,
  JWT_SECRET,
  PORT = 3000,
} = process.env;

if (!DATABASE_URL) {
  console.error('DATABASE_URL belum diset. Lihat .env.example.');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('JWT_SECRET belum diset. Lihat .env.example.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // dibutuhkan oleh Neon
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Kunci data yang boleh dibaca/ditulis lewat /api/data/:key
const ALLOWED_KEYS = new Set(['settings', 'santri', 'records']);

// ---------- Auth middleware ----------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Tidak ada token. Silakan login.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesi tidak valid atau kadaluarsa. Silakan login kembali.' });
  }
}

// ---------- Routes ----------
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan kata sandi wajib diisi.' });
    }
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Username atau kata sandi salah.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Username atau kata sandi salah.' });

    const token = jwt.sign(
      { sub: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, name: user.name, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user.name, username: req.user.username, role: req.user.role });
});

app.get('/api/data/:key', requireAuth, async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) return res.status(400).json({ error: 'Key tidak dikenal.' });
  try {
    const { rows } = await pool.query('SELECT value FROM app_data WHERE key = $1', [key]);
    res.json({ value: rows[0] ? rows[0].value : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data dari database.' });
  }
});

app.put('/api/data/:key', requireAuth, async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) return res.status(400).json({ error: 'Key tidak dikenal.' });
  const { value } = req.body || {};
  if (value === undefined) return res.status(400).json({ error: 'Field "value" wajib diisi.' });
  try {
    await pool.query(
      `INSERT INTO app_data (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan data ke database. Coba lagi.' });
  }
});

// Fallback: apapun rute lain arahkan ke index.html (single page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
