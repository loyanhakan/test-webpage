const express = require('express');
const { Pool } = require('pg');
const { createToken, verifyToken, needsRefresh } = require('../utils/session');
const { verifyTelegramWebAppData, parseInitData, isAuthDataFresh } = require('../utils/telegramAuth');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Use the same pool from server.js
let pool;

function setPool(dbPool) {
  pool = dbPool;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8475749598:AAHZ0NfuBj5iNLecdb3Us_Sipx2_JQHubH0';

/**
 * Telegram Mini App Authentication
 */
router.post('/miniapp', async (req, res) => {
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
    
    // Telegram Mini App initData verification
    if (initData && initData.length > 0) {
      console.log('🔐 InitData doğrulama başlatılıyor...');
      
      // Parse init data
      const parsedData = parseInitData(initData);
      if (!parsedData) {
        console.warn('⚠️ InitData parsing failed');
        return res.status(401).json({ error: 'Invalid init data format' });
      }
      
      // Verify auth data freshness
      if (!isAuthDataFresh(parsedData.authDate)) {
        console.warn('⚠️ Auth data too old');
        return res.status(401).json({ error: 'Authentication data expired' });
      }
      
      // Verify Telegram signature
      if (!verifyTelegramWebAppData(initData, TELEGRAM_BOT_TOKEN)) {
        console.warn('⚠️ Telegram signature verification failed');
        return res.status(401).json({ error: 'Invalid Telegram authentication' });
      }
      
      console.log('✅ InitData doğrulama başarılı');
    } else {
      console.log('ℹ️ InitData boş - doğrulama atlanıyor (development mode)');
    }
    
    console.log('🗃️ Database bağlantısı kuruluyor...');
    const client = await pool.connect();
    console.log('✅ Database bağlantısı başarılı');
    
    try {
      // Check if user exists
      console.log(`🔍 Kullanıcı aranıyor: telegram_id = ${id}`);
      const existingUser = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [id]
      );
      console.log(`📊 Bulunan kullanıcı sayısı: ${existingUser.rows.length}`);
      
      if (existingUser.rows.length > 0) {
        // Existing user - update info and create token
        const user = existingUser.rows[0];
        console.log('👤 Mevcut kullanıcı bulundu:', user.username);
        
        console.log('🔄 Kullanıcı bilgileri güncelleniyor...');
        await client.query(
          'UPDATE users SET first_name = $1, last_name = $2, photo_url = $3 WHERE telegram_id = $4',
          [first_name, last_name || null, photo_url || null, id]
        );
        
        // Get updated user data
        const updatedUser = await client.query(
          'SELECT * FROM users WHERE telegram_id = $1',
          [id]
        );
        
        const userData = updatedUser.rows[0];
        const token = createToken(userData);
        
        console.log('✅ Mevcut kullanıcı işlemi tamamlandı');
        res.json({ 
          isNewUser: false, 
          user: userData,
          token: token,
          tokenNeedsRefresh: false
        });
      } else {
        // New user
        console.log('👤 Yeni kullanıcı - username oluşturma gerekli');
        res.json({ isNewUser: true });
      }
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('❌ Mini App auth hatası:', err);
    
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

/**
 * Complete user profile (for new users)
 */
router.post('/complete-profile', async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url, auth_date } = req.body;
    
    if (!id || !username) {
      return res.status(400).json({ error: 'Telegram ID ve username gerekli' });
    }
    
    const client = await pool.connect();
    
    try {
      // Insert new user
      const result = await client.query(
        'INSERT INTO users (username, telegram_id, first_name, last_name, photo_url, auth_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [username.trim(), id, first_name, last_name || null, photo_url || null, auth_date]
      );
      
      const userData = result.rows[0];
      const token = createToken(userData);
      
      res.status(201).json({ 
        user: userData,
        token: token
      });
    } finally {
      client.release();
    }
    
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

/**
 * Refresh token
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const client = await pool.connect();
    
    try {
      // Get current user data
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = result.rows[0];
      const newToken = createToken(userData);
      
      res.json({ 
        token: newToken,
        user: userData
      });
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * Get current session info
 */
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = result.rows[0];
      
      res.json({ 
        user: userData,
        tokenValid: true
      });
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Session check error:', err);
    res.status(500).json({ error: 'Session check failed' });
  }
});

module.exports = { router, setPool };