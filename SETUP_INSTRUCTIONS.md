# 🚀 Hızlı Kurulum Talimatları

## 1. 📁 .env Dosyası Oluşturma

Proje klasöründe `.env` dosyası oluşturun ve şu içeriği ekleyin:

```bash
# .env dosyası
TELEGRAM_BOT_TOKEN=your_bot_token_here
DATABASE_URL=your_database_url_here
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://t.me,https://web.telegram.org
```

## 2. 🤖 Telegram Bot Oluşturma

1. Telegram'da **@BotFather**'a gidin
2. `/newbot` komutunu gönderin
3. Bot adı ve username'i belirleyin
4. Bot token'ını `.env` dosyasına ekleyin

## 3. 🚀 Local Test

```bash
# Bağımlılıkları yükleyin
npm install

# Development modda başlatın
npm run dev

# Tarayıcıda açın: http://localhost:3000
```

## 4. 🛤️ Railway Deployment

Detaylı Railway deployment talimatları için:
👉 **[RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)** dosyasını okuyun

### Hızlı Railway Setup:
```bash
# CLI yükleyin
npm install -g @railway/cli

# Login olun
railway login

# Projeyi init edin
railway init

# Environment variables ekleyin
railway variables set TELEGRAM_BOT_TOKEN=your_token
railway variables set NODE_ENV=production

# Deploy edin
railway up
```

## 5. 📱 Telegram Mini App Ayarları

1. **@BotFather**'a gidin
2. `/newapp` komutunu gönderin
3. Bot'unuzu seçin
4. App URL'si: `https://your-app-name.railway.app`
5. Test edin!

## 🔧 CORS Domain Ayarları

Railway'de deploy ettikten sonra:

```bash
# Railway domain'inizi CORS'a ekleyin
railway variables set ALLOWED_ORIGINS=https://your-app-name.railway.app,https://t.me,https://web.telegram.org
```

## ❓ Sorun mu yaşıyorsunuz?

**[RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)** dosyasında:
- Detaylı troubleshooting
- CORS ayarları
- Database konfigürasyonu
- Güvenlik best practices

bulabilirsiniz!