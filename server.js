const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = '8475749598:AAHZ0NfuBj5iNLecdb3Us_Sipx2_JQHubH0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_wLonvbEf3zF4@ep-solitary-smoke-a8p1cawx-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require",
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
        telegram_id BIGINT UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        photo_url TEXT,
        auth_date BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    client.release();
    console.log('Users tablosu başarıyla oluşturuldu');
  } catch (err) {
    console.error('Tablo oluşturma hatası:', err);
  }
}

// Telegram Auth Doğrulama Fonksiyonu
function verifyTelegramAuth(authData) {
  const { hash, ...data } = authData;
  
  // Data-check-string oluştur (alfabetik sıraya göre)
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
  
  // Bot token'ının SHA256 hash'ini secret key olarak kullan
  const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
  
  // HMAC-SHA256 hesapla
  const calculatedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  // Hash'leri karşılaştır
  return calculatedHash === hash;
}

// API Routes

// Telegram Auth Endpoint
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const authData = req.body;
    
    // Telegram auth verilerini doğrula
    if (!verifyTelegramAuth(authData)) {
      return res.status(401).json({ error: 'Geçersiz Telegram doğrulama' });
    }
    
    // Auth tarihini kontrol et (24 saat geçerli)
    const authDate = parseInt(authData.auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authDate > 86400) { // 24 saat = 86400 saniye
      return res.status(401).json({ error: 'Doğrulama süresi geçmiş' });
    }
    
    const client = await pool.connect();
    
    // Kullanıcıyı telegram_id'ye göre ara
    const existingUser = await client.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [authData.id]
    );
    
    if (existingUser.rows.length > 0) {
      // Mevcut kullanıcı
      const user = existingUser.rows[0];
      
      // Telegram bilgilerini güncelle
      await client.query(
        'UPDATE users SET first_name = $1, last_name = $2, photo_url = $3, auth_date = $4 WHERE telegram_id = $5',
        [authData.first_name, authData.last_name || null, authData.photo_url || null, authDate, authData.id]
      );
      
      client.release();
      res.json({ isNewUser: false, user });
    } else {
      // Yeni kullanıcı
      client.release();
      res.json({ isNewUser: true });
    }
    
  } catch (err) {
    console.error('Telegram auth hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Profil tamamlama endpoint'i
app.post('/api/users/complete-profile', async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url, auth_date } = req.body;
    
    if (!id || !username) {
      return res.status(400).json({ error: 'Telegram ID ve username gerekli' });
    }
    
    const client = await pool.connect();
    
    // Kullanıcıyı ekle
    const result = await client.query(
      'INSERT INTO users (username, telegram_id, first_name, last_name, photo_url, auth_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [username.trim(), id, first_name, last_name || null, photo_url || null, auth_date]
    );
    
    client.release();
    res.status(201).json({ user: result.rows[0] });
    
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      if (err.constraint === 'users_username_key') {
        res.status(400).json({ error: 'Bu username zaten kullanılıyor' });
      } else if (err.constraint === 'users_telegram_id_key') {
        res.status(400).json({ error: 'Bu Telegram hesabı zaten kayıtlı' });
      } else {
        res.status(400).json({ error: 'Bu bilgiler zaten kullanılıyor' });
      }
    } else {
      console.error('Profil tamamlama hatası:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
});

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

// Manuel kullanıcı ekleme kaldırıldı - sadece Telegram login

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Server başlat
app.listen(PORT, async () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  await createTable();
}); 