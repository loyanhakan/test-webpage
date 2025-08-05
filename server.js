const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { validate, parse } = require('@telegram-apps/init-data-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8475749598:AAHZ0NfuBj5iNLecdb3Us_Sipx2_JQHubH0';

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

// Legacy Telegram Widget Auth (deprecated - kept for reference)
function verifyTelegramAuth(authData) {
  console.warn('⚠️ Legacy Telegram Widget auth is deprecated. Use Mini App auth instead.');
  return false; // Always fail for security
}

// Middleware fonksiyonları

/**
 * Sets init data in the specified Response object.
 * @param res - Response object.
 * @param initData - init data.
 */
function setInitData(res, initData) {
  res.locals.initData = initData;
}

/**
 * Extracts init data from the Response object.
 * @param res - Response object.
 * @returns Init data stored in the Response object. Can return undefined in case,
 * the client is not authorized.
 */
function getInitData(res) {
  return res.locals.initData;
}

/**
 * Middleware which authorizes the external client.
 * @param req - Request object.
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */
const authMiddleware = (req, res, next) => {
  // We expect passing init data in the Authorization header in the following format:
  // <auth-type> <auth-data>
  // <auth-type> must be "tma", and <auth-data> is Telegram Mini Apps init data.
  const authHeader = req.header('authorization') || '';
  const [authType, authData = ''] = authHeader.split(' ');

  switch (authType) {
    case 'tma':
      try {
        // Validate init data.
        validate(authData, TELEGRAM_BOT_TOKEN, {
          // We consider init data sign valid for 1 hour from their creation moment.
          expiresIn: 3600,
        });

        // Parse init data. We will surely need it in the future.
        setInitData(res, parse(authData));
        return next();
      } catch (e) {
        console.error('TMA Auth validation error:', e.message);
        return res.status(401).json({ error: 'Invalid Mini App authentication' });
      }
    // Legacy support for direct JSON data (development/testing)
    case 'legacy':
      // For development - direct user data without validation
      if (process.env.NODE_ENV === 'development') {
        try {
          const userData = JSON.parse(authData);
          if (userData.id && userData.first_name) {
            return next();
          }
        } catch (e) {
          // Fall through to unauthorized
        }
      }
      return res.status(401).json({ error: 'Legacy auth not supported in production' });
    default:
      return res.status(401).json({ error: 'Unauthorized - Missing or invalid auth type' });
  }
};

/**
 * Optional middleware - only validates if auth header exists
 */
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.header('authorization');
  if (!authHeader || authHeader.trim() === '') {
    // No auth header - continue without setting init data
    return next();
  }
  
  // Auth header exists - validate it
  return authMiddleware(req, res, next);
};

// API Routes with proper middleware

/**
 * Middleware which shows the user init data.
 * @param req
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */
const showInitDataMiddleware = (req, res, next) => {
  const initData = getInitData(res);
  if (!initData) {
    return res.status(401).json({ error: 'Init data not found - unauthorized' });
  }
  res.json(initData);
};

// Mini App Auth Endpoint with proper validation
app.post('/api/auth/miniapp', optionalAuthMiddleware, async (req, res) => {
  console.log('📥 Mini App Auth Request Received');
  
  try {
    let userData;
    const initData = getInitData(res);
    
    if (initData && initData.user) {
      // Use validated init data from middleware
      userData = initData.user;
      console.log('✅ Using validated init data from middleware');
    } else {
      // Fallback to request body (for development/testing)
      userData = req.body;
      console.log('⚠️ Using request body data (development mode)');
    }
    
    const { id, first_name, last_name, username, photo_url } = userData;
    
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

// Debug endpoint to show validated init data
app.get('/api/debug/initdata', authMiddleware, showInitDataMiddleware);

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