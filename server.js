const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8475749598:AAHZ0NfuBj5iNLecdb3Us_Sipx2_JQHubH0';

// CORS Configuration - Production Ready
const corsOptions = {
  origin: function (origin, callback) {
    // Development'ta tüm origin'lere izin ver
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // Production'da sadece belirli domain'lere izin ver
    const allowedOrigins = [
      'https://your-domain.com',
      'https://t.me',
      'https://web.telegram.org'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
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

// Telegram Hash Doğrulama Fonksiyonu
function checkTelegramAuth(data, botToken) {
  try {
    console.log('🔐 Hash doğrulama başlatılıyor...');
    console.log('📋 Gelen data:', data);
    
    const { hash, ...otherData } = data;
    
    if (!hash) {
      console.error('❌ Hash parametresi bulunamadı');
      return false;
    }
    
    // Bot token'ından secret key oluştur
    const secret = crypto.createHash('sha256').update(botToken).digest();
    
    // Data-check-string oluştur (hash hariç, alfabetik sırada)
    const payload = Object.keys(otherData)
      .filter(k => otherData[k] !== null && otherData[k] !== undefined)
      .sort()
      .map(k => `${k}=${otherData[k]}`)
      .join('\n');
    
    console.log('📝 Payload string:', payload);
    
    // HMAC-SHA256 hesapla
    const hmac = crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    console.log('🔑 Calculated hash:', hmac);
    console.log('🔑 Received hash:', hash);
    
    const isValid = hmac === hash;
    console.log(isValid ? '✅ Hash doğrulama başarılı' : '❌ Hash doğrulama başarısız');
    
    return isValid;
  } catch (error) {
    console.error('❌ Hash doğrulama hatası:', error);
    return false;
  }
}

// Rate Limiting (Simple)
const requestCounts = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function rateLimit(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(clientIp)) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  const clientData = requestCounts.get(clientIp);
  
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_WINDOW;
    return next();
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  clientData.count++;
  next();
}

// API Routes

// Telegram Mini App Auth Endpoint
app.post('/api/auth/telegram', rateLimit, async (req, res) => {
  console.log('📥 Telegram Auth Request Received');
  console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const userData = req.body;
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = userData;
    
    // Input validation
    if (!id) {
      console.error('❌ Telegram ID eksik');
      return res.status(400).json({ error: 'Telegram ID gerekli' });
    }
    
    if (!first_name) {
      console.error('❌ First name eksik');
      return res.status(400).json({ error: 'İsim gerekli' });
    }
    
    // Production'da hash doğrulama zorunlu
    if (process.env.NODE_ENV === 'production') {
      if (!hash) {
        console.error('❌ Hash parametresi eksik');
        return res.status(400).json({ error: 'Hash gerekli' });
      }
      
      if (!checkTelegramAuth(userData, TELEGRAM_BOT_TOKEN)) {
        console.error('❌ Telegram hash doğrulama başarısız');
        return res.status(401).json({ error: 'Geçersiz Telegram doğrulama' });
      }
      
      // Auth_date kontrolü (1 saat geçerlilik)
      if (auth_date) {
        const authTime = parseInt(auth_date);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - authTime;
        
        if (timeDiff > 3600) { // 1 saat = 3600 saniye
          console.error('❌ Auth data çok eski:', timeDiff, 'saniye');
          return res.status(401).json({ error: 'Auth data süresi dolmuş' });
        }
      }
    } else {
      console.log('⚠️ Development mode - hash doğrulama atlanıyor');
    }
    
    console.log(`👤 Processing user: ${first_name} (ID: ${id})`);
    
    console.log('🗃️ Database bağlantısı kuruluyor...');
    const client = await pool.connect();
    console.log('✅ Database bağlantısı başarılı');
    
    try {
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
          'UPDATE users SET first_name = $1, last_name = $2, photo_url = $3, auth_date = $4 WHERE telegram_id = $5',
          [first_name, last_name || null, photo_url || null, auth_date || null, id]
        );
        
        // Güncellenmiş kullanıcı bilgilerini al
        console.log('📊 Güncellenmiş kullanıcı bilgileri alınıyor...');
        const updatedUser = await client.query(
          'SELECT * FROM users WHERE telegram_id = $1',
          [id]
        );
        
        console.log('✅ Mevcut kullanıcı işlemi tamamlandı');
        res.json({ 
          success: true,
          isNewUser: false, 
          user: updatedUser.rows[0] 
        });
      } else {
        // Yeni kullanıcı
        console.log('👤 Yeni kullanıcı - username oluşturma gerekli');
        res.json({ 
          success: true,
          isNewUser: true,
          userData: userData 
        });
      }
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('❌ Telegram auth hatası:', err);
    console.error('❌ Error stack:', err.stack);
    
    // Güvenli hata mesajları
    let errorMessage = 'Sunucu hatası';
    if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Database bağlantı hatası';
    } else if (err.code === '42P01') {
      errorMessage = 'Database tablo bulunamadı';
    } else if (err.code === '42703') {
      errorMessage = 'Database kolon bulunamadı';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      detail: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
    });
  }
});

// Legacy Mini App endpoint - redirect to new endpoint
app.post('/api/auth/miniapp', (req, res) => {
  console.log('⚠️ Legacy miniapp endpoint called - redirecting to /api/auth/telegram');
  res.status(301).json({ 
    error: 'Endpoint moved', 
    newEndpoint: '/api/auth/telegram',
    message: 'Please use /api/auth/telegram endpoint' 
  });
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