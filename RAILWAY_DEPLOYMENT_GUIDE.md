# 🚀 Railway Deployment Guide - Telegram Mini App

Bu guide, Telegram Mini App projenizi Railway'de deploy etmek için adım adım talimatlar içerir.

## 📋 Ön Hazırlık

### 1. Telegram Bot Oluşturma
```bash
# Telegram'da @BotFather'a gidin ve yeni bot oluşturun
/newbot
# Bot adı: MyApp Bot
# Bot username: myapp_bot

# Bot token'ını kaydedin: 1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### 2. Local .env Dosyası Oluşturma
Proje klasöründe `.env` dosyası oluşturun:
```bash
# .env dosyası (bu dosyayı .gitignore'a ekleyin!)
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://t.me,https://web.telegram.org
```

## 🛤️ Railway Deployment

### Adım 1: Railway Hesabı ve CLI
```bash
# Railway CLI yükleyin
npm install -g @railway/cli

# Railway hesabınıza login olun
railway login

# Proje klasöründe railway init
railway init
```

### Adım 2: PostgreSQL Database Ekleme
```bash
# Railway dashboard'da yeni PostgreSQL service ekleyin
railway add postgresql

# Database URL'sini environment variable olarak kullanacağız
# Railway otomatik olarak DATABASE_URL'yi set eder
```

### Adım 3: Environment Variables Ayarlama
```bash
# Telegram Bot Token
railway variables set TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Production Environment
railway variables set NODE_ENV=production

# CORS Domains (Railway domain'inizi ekleyin)
railway variables set ALLOWED_ORIGINS=https://your-app-name.railway.app,https://t.me,https://web.telegram.org

# Port (Railway otomatik set eder, ama manuel de ekleyebilirsiniz)
railway variables set PORT=3000
```

### Adım 4: Deploy
```bash
# Projeyi deploy edin
railway up

# Deploy durumunu takip edin
railway logs

# Live URL'yi alın
railway domain
```

## 🔧 Railway Dashboard Konfigürasyonu

### 1. Service Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: `/` (varsayılan)

### 2. Environment Variables
Railway Dashboard → Variables bölümünde şunları ekleyin:
```
TELEGRAM_BOT_TOKEN = 1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
NODE_ENV = production
ALLOWED_ORIGINS = https://your-app-name.railway.app,https://t.me,https://web.telegram.org
```

### 3. Custom Domain (Opsiyonel)
```bash
# Custom domain eklemek için
railway domain add yourdomain.com

# CORS ayarlarını güncelleme
railway variables set ALLOWED_ORIGINS=https://yourdomain.com,https://t.me,https://web.telegram.org
```

## 📱 Telegram Mini App Konfigürasyonu

### 1. Bot'a Mini App Ekleme
```bash
# @BotFather'a gidin
/newapp

# Bot'unuzu seçin: @myapp_bot
# App adı: MyApp
# App açıklaması: User Management App
# App URL: https://your-app-name.railway.app
# Short name: myapp (isteğe bağlı)
```

### 2. Mini App Test Etme
```bash
# Bot'unuza gidin: @myapp_bot
# /start komutunu gönderin
# "MyApp" butonuna tıklayın
# Uygulama açılacak!
```

## 🔍 Domain ve CORS Ayarları

### Railway Domain Alma
```bash
# Railway otomatik domain verir
https://your-app-name.railway.app

# Bu domain'i CORS'a ekleyin:
railway variables set ALLOWED_ORIGINS=https://your-app-name.railway.app,https://t.me,https://web.telegram.org
```

### Custom Domain (İsteğe Bağlı)
```bash
# Railway'e custom domain ekleyin
railway domain add myapp.com

# DNS ayarları (domain providerınızda):
# CNAME: your-app-name.railway.app

# CORS güncelleme:
railway variables set ALLOWED_ORIGINS=https://myapp.com,https://t.me,https://web.telegram.org
```

## 🛠️ Troubleshooting

### 1. CORS Hatası
```bash
# Error: CORS policy violation
# Çözüm: Domain'i ALLOWED_ORIGINS'e ekleyin

railway variables set ALLOWED_ORIGINS=https://your-new-domain.com,https://t.me,https://web.telegram.org
```

### 2. Database Bağlantı Hatası
```bash
# Database URL'sini kontrol edin
railway variables

# Database service'in çalıştığını kontrol edin
railway status
```

### 3. Bot Token Hatası
```bash
# Bot token'ın doğru olduğunu kontrol edin
railway variables get TELEGRAM_BOT_TOKEN

# @BotFather'dan yeni token alın
/token
```

### 4. Hash Doğrulama Hatası
```bash
# Production'da hash doğrulama zorunlu
# Development'ta test için:
railway variables set NODE_ENV=development

# Production'a geri dönmek için:
railway variables set NODE_ENV=production
```

## 📊 Monitoring ve Logs

### Railway Dashboard
- **Metrics**: CPU, Memory, Network kullanımı
- **Logs**: Real-time uygulama logları
- **Deployments**: Geçmiş deployment'lar

### CLI Commands
```bash
# Live logs
railway logs --follow

# Service durumu
railway status

# Environment variables
railway variables

# Database bağlantısı
railway connect postgresql
```

## 🔒 Güvenlik Best Practices

### 1. Environment Variables
```bash
# Asla kod içinde hardcode etmeyin
# Her zaman environment variables kullanın
TELEGRAM_BOT_TOKEN=xxx
DATABASE_URL=xxx
```

### 2. CORS Ayarları
```bash
# Sadece gerekli domain'lere izin verin
ALLOWED_ORIGINS=https://yourdomain.com,https://t.me,https://web.telegram.org
```

### 3. Rate Limiting
```javascript
// server.js'te aktif:
// Dakikada 10 istek sınırı
const RATE_LIMIT = 10;
```

## 🚀 Go Live Checklist

- [ ] Railway'de PostgreSQL service eklendi
- [ ] Environment variables set edildi
- [ ] CORS domain'leri güncellendi
- [ ] Telegram Bot oluşturuldu
- [ ] Mini App URL'si bot'a eklendi
- [ ] Hash doğrulama test edildi
- [ ] Production'da test yapıldı

## 📝 Örnek Environment Variables

```bash
# Railway Production Environment
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DATABASE_URL=postgresql://postgres:***@containers-us-west-123.railway.app:6543/railway
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://myapp-production.railway.app,https://t.me,https://web.telegram.org
```

## 🎯 Son Adımlar

1. **Deploy**: `railway up`
2. **Test**: Railway URL'sinde uygulamayı test edin
3. **Bot**: @BotFather'da Mini App URL'sini güncelleyin
4. **Live**: Telegram'da bot'unuzu test edin

🎉 **Tebrikler! Telegram Mini App'iniz Railway'de live!**

## 📞 Destek

- **Railway Docs**: https://docs.railway.app
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Mini Apps Guide**: https://docs.telegram-mini-apps.com

---

**Not**: Bu guide'daki domain örneklerini kendi domain'inizle değiştirin.