# Kullanıcı Yönetimi Uygulaması

Bu proje, PostgreSQL veritabanı ile kullanıcı kaydetme ve listeleme işlemlerini yapan basit bir web uygulamasıdır.

## 🚀 Özellikler

- ✅ Kullanıcı adı kaydetme
- ✅ Kayıtlı kullanıcıları listeleme
- ✅ PostgreSQL veritabanı entegrasyonu
- ✅ Modern ve responsive tasarım
- ✅ Railway üzerinde deployment

## 🛠️ Teknolojiler

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Veritabanı**: PostgreSQL
- **Deployment**: Railway

## 📦 Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Environment variables ayarlayın:**
```bash
# .env dosyası oluşturun
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=development
```

3. **Uygulamayı başlatın:**
```bash
# Development
npm run dev

# Production
npm start
```

## 🌐 API Endpoints

- `GET /api/users` - Tüm kullanıcıları getir
- `POST /api/users` - Yeni kullanıcı ekle

## 🚀 Railway Deployment

1. GitHub reponuzu Railway'e bağlayın
2. Environment variables ayarlayın:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NODE_ENV`: production
3. Deploy edin!

## 📝 Kullanım

1. Kullanıcı adı girin
2. "Kaydet" butonuna tıklayın
3. Kayıtlı kullanıcıları görüntüleyin
4. "Yenile" butonu ile listeyi güncelleyin

## 🔮 Gelecek Özellikler

- [ ] Telegram Login Widget entegrasyonu
- [ ] JWT authentication
- [ ] Kullanıcı profil yönetimi
- [ ] Kullanıcı silme/düzenleme 