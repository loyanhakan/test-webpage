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

// Mini App Auth Endpoint (initData doğrulama)
function verifyMiniAppInitData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    // Parametreleri alfabetik sıraya göre dizle
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Bot token'ının SHA256 hash'ini secret key olarak kullan
    const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
    
    // HMAC-SHA256 hesapla
    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('InitData doğrulama hatası:', error);
    return false;
  }
}

app.post('/api/auth/miniapp', async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url, initData } = req.body;
    
    // Mini App initData doğrulama (opsiyonel - production'da açılabilir)
    if (initData && !verifyMiniAppInitData(initData)) {
      console.warn('Mini App initData doğrulama başarısız');
      // Development'ta warn, production'da reject
      // return res.status(401).json({ error: 'Geçersiz Mini App doğrulama' });
    }
    
    const client = await pool.connect();
    
    // Kullanıcıyı telegram_id'ye göre ara
    const existingUser = await client.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [id]
    );
    
    if (existingUser.rows.length > 0) {
      // Mevcut kullanıcı - bilgilerini güncelle
      const user = existingUser.rows[0];
      
      await client.query(
        'UPDATE users SET first_name = $1, last_name = $2, photo_url = $3 WHERE telegram_id = $4',
        [first_name, last_name || null, photo_url || null, id]
      );
      
      // Güncellenmiş kullanıcı bilgilerini al
      const updatedUser = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [id]
      );
      
      client.release();
      res.json({ isNewUser: false, user: updatedUser.rows[0] });
    } else {
      // Yeni kullanıcı
      client.release();
      res.json({ isNewUser: true });
    }
    
  } catch (err) {
    console.error('Mini App auth hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Legacy: Telegram Widget Auth (artık kullanılmıyor)
app.post('/api/auth/telegram', async (req, res) => {
  res.status(410).json({ error: 'Widget auth artık desteklenmiyor. Mini App kullanın.' });
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