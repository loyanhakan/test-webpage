# Telegram Mini App - Kullanıcı Yönetimi

Bu proje, Telegram Mini Apps platformu için geliştirilmiş, kullanıcı yetkilendirme ve yönetim sistemi içeren bir web uygulamasıdır. Telegram'ın [resmi dokümantasyonuna](https://docs.telegram-mini-apps.com/platform/authorizing-user) uygun olarak geliştirilmiştir.

## 🚀 Özellikler

- ✅ **Telegram Mini App Entegrasyonu** - Tam uyumlu Telegram Mini App
- ✅ **Güvenli Kullanıcı Yetkilendirme** - Init data doğrulama ile güvenli auth
- ✅ **Modern Middleware Yapısı** - Express.js middleware pattern
- ✅ **PostgreSQL Entegrasyonu** - Kullanıcı verilerinin güvenli saklanması
- ✅ **Responsive Tasarım** - Tüm cihazlarda mükemmel görünüm
- ✅ **Production Ready** - Railway deployment desteği

## 🛠️ Teknolojiler

### Frontend
- **HTML5/CSS3/JavaScript** - Modern web teknolojileri
- **Telegram WebApp SDK** - Resmi Telegram SDK
- **Responsive Design** - Mobil-first yaklaşım

### Backend
- **Node.js & Express.js** - Server framework
- **@telegram-apps/init-data-node** - Resmi Telegram init data doğrulama
- **PostgreSQL** - Veritabanı
- **CORS & Security Middleware** - Güvenlik katmanları

## 📦 Kurulum

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Environment Variables Ayarlayın
```bash
# .env dosyası oluşturun
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=development
PORT=3000
```

### 3. Telegram Bot Kurulumu
1. [@BotFather](https://t.me/botfather) ile yeni bir bot oluşturun
2. Bot token'ını `.env` dosyasına ekleyin
3. Bot ayarlarından "Mini App" özelliğini aktifleştirin
4. Mini App URL'ini ayarlayın

### 4. Uygulamayı Başlatın
```bash
# Development
npm run dev

# Production
npm start
```

## 🔐 Güvenlik ve Yetkilendirme

### Authorization Header Formatı
Uygulama, Telegram Mini Apps [resmi dokümantasyonuna](https://docs.telegram-mini-apps.com/platform/authorizing-user) uygun olarak şu authorization header formatını kullanır:

```
Authorization: tma <initData>
```

### Middleware Yapısı
```javascript
// Zorunlu yetkilendirme
app.use('/api/secure', authMiddleware);

// Opsiyonel yetkilendirme
app.use('/api/public', optionalAuthMiddleware);
```

### Init Data Doğrulama
- **@telegram-apps/init-data-node** paketi kullanılır
- 1 saat geçerlilik süresi
- HMAC-SHA256 imza doğrulaması
- Bot token tabanlı güvenlik

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/miniapp` - Telegram Mini App kullanıcı yetkilendirme
- `GET /api/debug/initdata` - Init data debug (development)

### Users
- `GET /api/users` - Tüm kullanıcıları listele
- `POST /api/users/complete-profile` - Kullanıcı profil tamamlama

### Legacy (Deprecated)
- `POST /api/auth/telegram` - Eski widget auth (artık desteklenmiyor)

## 📱 Telegram Mini App Kurulumu

### 1. Bot Configuration
```bash
/newapp
# Bot adınızı seçin
# Mini App adını girin
# Mini App açıklamasını girin
# URL'nizi girin: https://your-domain.com
```

### 2. Test Etme
1. Telegram'da botunuzu açın
2. Mini App butonuna tıklayın
3. Uygulama otomatik olarak açılacak

### 3. Production Deployment
Railway, Heroku, Vercel veya benzeri platformlarda deploy edebilirsiniz.

## 🚀 Railway Deployment

### 1. Hazırlık
```bash
# Railway CLI yükleyin
npm install -g @railway/cli

# Login olun
railway login
```

### 2. Deploy
```bash
# Proje oluşturun
railway init

# Environment variables ayarlayın
railway variables set TELEGRAM_BOT_TOKEN=your_token
railway variables set DATABASE_URL=your_db_url
railway variables set NODE_ENV=production

# Deploy edin
railway up
```

### 3. Environment Variables
```
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
PORT=3000
```

## 🔄 Development vs Production

### Development Mode
- Legacy auth desteği
- Detaylı hata mesajları
- Debug endpoint aktif
- Init data doğrulama opsiyonel

### Production Mode
- Sadece TMA auth
- Güvenli hata mesajları
- Debug endpoint kapalı
- Zorunlu init data doğrulama

## 📋 Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  telegram_id BIGINT UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  photo_url TEXT,
  auth_date BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🐛 Troubleshooting

### Common Issues

1. **Init Data Validation Failed**
   - Bot token kontrolü yapın
   - Telegram'dan gelen data formatını kontrol edin
   - Zaman damgası geçerliliğini kontrol edin

2. **Database Connection Error**
   - PostgreSQL bağlantı string kontrolü
   - SSL ayarlarını kontrol edin
   - Network erişimini kontrol edin

3. **Mini App Not Loading**
   - HTTPS zorunluluğu
   - CORS ayarlarını kontrol edin
   - Telegram WebApp SDK yüklenmesini kontrol edin

### Debug Mode
```javascript
// Client tarafında
console.log('Telegram WebApp:', window.Telegram.WebApp);
console.log('Init Data:', window.Telegram.WebApp.initData);

// Server tarafında
GET /api/debug/initdata
```

## 📚 Referanslar

- [Telegram Mini Apps Documentation](https://docs.telegram-mini-apps.com/)
- [Telegram WebApp API](https://core.telegram.org/bots/webapps)
- [@telegram-apps/init-data-node](https://www.npmjs.com/package/@telegram-apps/init-data-node)
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 🔗 Links

- **Live Demo**: [https://test-webpage-production.up.railway.app/](https://test-webpage-production.up.railway.app/)
- **Telegram Bot**: [Bot Token: 8475749598:AAHZ0NfuBj5iNLecdb3Us_Sipx2_JQHubH0]
- **Railway App**: [Production Ready]
- **Documentation**: [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)