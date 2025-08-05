const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:RsCtzwkRSNMnnndBYGDmpWDWnkhtXSFi@yamabiko.proxy.rlwy.net:16397/railway",
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Veritabanı tablosunu oluştur
async function createTable() {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    client.release();
    console.log('Users tablosu başarıyla oluşturuldu');
  } catch (err) {
    console.error('Tablo oluşturma hatası:', err);
  }
}

// API Routes

// Tüm kullanıcıları getir
app.get('/api/users', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
    client.release();
    res.json(result.rows);
  } catch (err) {
    console.error('Kullanıcıları getirme hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Yeni kullanıcı ekle
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  
  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username gerekli' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO users (username) VALUES ($1) RETURNING *',
      [username.trim()]
    );
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Bu username zaten kullanılıyor' });
    } else {
      console.error('Kullanıcı ekleme hatası:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
});

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Server başlat
app.listen(PORT, async () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  await createTable();
}); 