const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// Import route modules
const { router: authRouter, setPool } = require('./routes/auth');
const protectedRouter = require('./routes/protected');
const { optionalAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = '8475749598:AAHZ0NfuBj5iNLecdb3Us_Sipx2_JQHubH0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    `);
    
    client.release();
    console.log('Users tablosu başarıyla oluşturuldu');
  } catch (err) {
    console.error('Tablo oluşturma hatası:', err);
  }
}

// Set pool for auth routes
setPool(pool);

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
app.use('/api/auth', authRouter);
app.use('/api/protected', protectedRouter);

// Legacy Mini App Auth Endpoint (moved to routes/auth.js)
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
  console.log('📥 Mini App Auth Request Received');
  console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { id, first_name, last_name, username, photo_url, initData } = req.body;
    
    // Input validation
    if (!id) {
      console.error('❌ Telegram ID eksik');
      return res.status(400).json({ error: 'Telegram ID gerekli' });
    }
    
    if (!first_name) {
      console.error('❌ First name eksik');
      return res.status(400).json({ error: 'İsim gerekli' });
    }
    
    console.log(`👤 Processing user: ${first_name} (ID: ${id})`);
    
    // Mini App initData doğrulama (opsiyonel - production'da açılabilir)
    if (initData && initData.length > 0) {
      console.log('🔐 InitData doğrulama başlatılıyor...');
      if (!verifyMiniAppInitData(initData)) {
        console.warn('⚠️ Mini App initData doğrulama başarısız');
        // Development'ta warn, production'da reject
        // return res.status(401).json({ error: 'Geçersiz Mini App doğrulama' });
      } else {
        console.log('✅ InitData doğrulama başarılı');
      }
    } else {
      console.log('ℹ️ InitData boş - doğrulama atlanıyor');
    }
    
    console.log('🗃️ Database bağlantısı kuruluyor...');
    const client = await pool.connect();
    console.log('✅ Database bağlantısı başarılı');
    
    // Kullanıcıyı telegram_id'ye göre ara
    console.log(`🔍 Kullanıcı aranıyor: telegram_id = ${id}`);
    const existingUser = await client.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [id]
    );
    console.log(`📊 Bulunan kullanıcı sayısı: ${existingUser.rows.length}`);
    
    if (existingUser.rows.length > 0) {
      // Mevcut kullanıcı - bilgilerini güncelle
      const user = existingUser.rows[0];
      console.log('👤 Mevcut kullanıcı bulundu:', user.username);
      
      console.log('🔄 Kullanıcı bilgileri güncelleniyor...');
      await client.query(
        'UPDATE users SET first_name = $1, last_name = $2, photo_url = $3 WHERE telegram_id = $4',
        [first_name, last_name || null, photo_url || null, id]
      );
      
      // Güncellenmiş kullanıcı bilgilerini al
      console.log('📊 Güncellenmiş kullanıcı bilgileri alınıyor...');
      const updatedUser = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [id]
      );
      
      client.release();
      console.log('✅ Mevcut kullanıcı işlemi tamamlandı');
      res.json({ isNewUser: false, user: updatedUser.rows[0] });
    } else {
      // Yeni kullanıcı
      console.log('👤 Yeni kullanıcı - username oluşturma gerekli');
      client.release();
      res.json({ isNewUser: true });
    }
    
  } catch (err) {
    console.error('❌ Mini App auth hatası:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error code:', err.code);
    console.error('❌ Error detail:', err.detail);
    
    // Daha detaylı hata mesajı
    let errorMessage = 'Sunucu hatası';
    if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Database bağlantı hatası';
    } else if (err.code === '42P01') {
      errorMessage = 'Database tablo bulunamadı';
    } else if (err.code === '42703') {
      errorMessage = 'Database kolon bulunamadı';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

// Korumalı sayfa
app.get('/protected', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'protected.html'));
});

// Server başlat
app.listen(PORT, async () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  await createTable();
}); 