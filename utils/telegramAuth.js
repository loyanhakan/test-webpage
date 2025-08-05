const crypto = require('crypto');

/**
 * Verify Telegram Web App init data
 */
function verifyTelegramWebAppData(initData, botToken) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    // Sort parameters alphabetically
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Create secret key from bot token
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    
    // Calculate HMAC-SHA256
    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Telegram auth verification error:', error);
    return false;
  }
}

/**
 * Verify Telegram Login Widget data
 */
function verifyTelegramAuth(authData, botToken) {
  const { hash, ...data } = authData;
  
  // Create data-check-string (alphabetically sorted)
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
  
  // Create secret key from bot token
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  
  // Calculate HMAC-SHA256
  const calculatedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  // Compare hashes
  return calculatedHash === hash;
}

/**
 * Check if auth data is not too old (max 24 hours)
 */
function isAuthDataFresh(authDate, maxAgeInSeconds = 86400) {
  const currentTime = Math.floor(Date.now() / 1000);
  return (currentTime - authDate) <= maxAgeInSeconds;
}

/**
 * Parse Telegram Web App init data
 */
function parseInitData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const user = urlParams.get('user');
    const authDate = urlParams.get('auth_date');
    
    if (!user) {
      throw new Error('User data not found in init data');
    }
    
    const userData = JSON.parse(user);
    return {
      user: userData,
      authDate: parseInt(authDate),
      raw: initData
    };
  } catch (error) {
    console.error('Error parsing init data:', error);
    return null;
  }
}

module.exports = {
  verifyTelegramWebAppData,
  verifyTelegramAuth,
  isAuthDataFresh,
  parseInitData
};