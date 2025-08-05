// API base URL
const API_BASE = window.location.origin;

// DOM elementleri
const loginSection = document.getElementById('loginSection');
const usernameSection = document.getElementById('usernameSection');
const profileSection = document.getElementById('profileSection');
const usernameForm = document.getElementById('usernameForm');
const usernameInput = document.getElementById('username');
const usernameMessage = document.getElementById('usernameMessage');
const welcomeName = document.getElementById('welcomeName');
const userProfile = document.getElementById('userProfile');
const usersListDiv = document.getElementById('usersList');

// Global user data
let currentTelegramUser = null;

// Sayfa yüklendiğinde kontrol et
window.onload = function() {
    console.log('Kullanıcı yönetimi sayfası yüklendi!');
    
    // Telegram Mini App kontrolü
    if (window.Telegram && window.Telegram.WebApp) {
        console.log('Telegram Mini App detected!');
        initMiniApp();
    } else {
        // Normal web sayfası - session kontrol et
        checkExistingSession();
    }
    
    loadUsers();
};

// Mini App initialization
function initMiniApp() {
    console.log('🚀 Mini App başlatılıyor...');
    const tg = window.Telegram.WebApp;
    
    // Debug bilgileri
    console.log('Telegram WebApp Object:', tg);
    console.log('WebApp Version:', tg.version);
    console.log('Platform:', tg.platform);
    console.log('Is Expanded:', tg.isExpanded);
    
    // Mini App'i genişlet
    tg.expand();
    tg.ready(); // WebApp'in hazır olduğunu Telegram'a bildir
    
    // Tema renklerini ayarla
    document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';
    
    try {
        // Kullanıcı verilerini al
        const initData = tg.initData;
        const initDataUnsafe = tg.initDataUnsafe;
        
        console.log('📋 InitData:', initData);
        console.log('📋 InitDataUnsafe:', initDataUnsafe);
        
        if (initDataUnsafe && initDataUnsafe.user) {
            // Kullanıcı bilgileri mevcut
            const user = initDataUnsafe.user;
            console.log('👤 Mini App User:', user);
            
            showMessage('✅ Kullanıcı bilgileri alındı, doğrulanıyor...', 'success', 'loginMessage');
            
            // Telegram auth verilerini doğrula
            verifyMiniAppAuth({
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                photo_url: user.photo_url,
                initData: initData
            });
        } else {
            console.warn('⚠️ InitDataUnsafe.user bulunamadı');
            console.log('InitDataUnsafe structure:', JSON.stringify(initDataUnsafe, null, 2));
            
            // Debug için bekleme ekleyelim
            setTimeout(() => {
                if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                    console.log('🔄 Retry: User data bulundu');
                    initMiniApp();
                } else {
                    // Development fallback - demo user
                    console.log('⚠️ Development mode: Demo user kullanılıyor');
                    const demoUser = {
                        id: 123456789,
                        first_name: 'Demo',
                        last_name: 'User',
                        username: 'demo_user',
                        photo_url: null,
                        initData: ''
                    };
                    verifyMiniAppAuth(demoUser);
                }
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Mini App init error:', error);
        showMessage('❌ Mini App başlatma hatası: ' + error.message, 'error', 'loginMessage');
    }
}

// Mevcut session kontrolü
function checkExistingSession() {
    const savedUser = localStorage.getItem('telegramUser');
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        currentTelegramUser = userData;
        showProfileSection(userData);
    }
}

// Mini App auth doğrulama
async function verifyMiniAppAuth(userData) {
    try {
        console.log('🔐 Auth başlatılıyor:', userData);
        currentTelegramUser = userData;
        
        console.log('📡 API Base:', API_BASE);
        console.log('📡 Request URL:', `${API_BASE}/api/auth/miniapp`);
        
        // Prepare headers with Authorization format: "tma <initData>"
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add Authorization header if initData is available
        if (userData.initData && userData.initData.length > 0) {
            headers.Authorization = `tma ${userData.initData}`;
            console.log('✅ Authorization header eklendi');
        } else {
            // Fallback for development - use legacy auth
            headers.Authorization = `legacy ${JSON.stringify({
                id: userData.id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                username: userData.username,
                photo_url: userData.photo_url
            })}`;
            console.log('⚠️ Legacy authorization kullanılıyor (development)');
        }
        
        const response = await fetch(`${API_BASE}/api/auth/miniapp`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(userData)
        });

        console.log('📡 Response Status:', response.status);
        console.log('📡 Response OK:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response Error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Auth Response:', data);

        if (data.isNewUser) {
            // Yeni kullanıcı - username oluşturma formunu göster
            console.log('👤 Yeni kullanıcı - username formu gösteriliyor');
            showUsernameForm(userData);
        } else {
            // Mevcut kullanıcı - profil sayfasını göster
            console.log('✅ Mevcut kullanıcı - profil gösteriliyor');
            localStorage.setItem('telegramUser', JSON.stringify(data.user));
            showProfileSection(data.user);
        }
    } catch (error) {
        console.error('❌ Mini App auth hatası:', error);
        
        // Detaylı hata mesajı
        let errorMessage = 'Sunucu hatası oluştu!';
        if (error.message.includes('fetch')) {
            errorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
        } else if (error.message.includes('HTTP 404')) {
            errorMessage = 'API endpoint bulunamadı. Sunucu çalışmıyor olabilir.';
        } else if (error.message.includes('HTTP 500')) {
            errorMessage = 'Sunucu iç hatası. Geliştirici ile iletişime geçin.';
        }
        
        showMessage('❌ ' + errorMessage, 'error', 'loginMessage');
    }
}

// Legacy: Telegram Widget auth (artık kullanılmıyor)
function onTelegramAuth(user) {
    console.log('Legacy Telegram Widget - kullanılmıyor');
}

// Username oluşturma formunu göster
function showUsernameForm(telegramUser) {
    loginSection.style.display = 'none';
    usernameSection.style.display = 'block';
    profileSection.style.display = 'none';
    
    welcomeName.textContent = telegramUser.first_name || 'Arkadaş';
    
    // Mini App'te ana buton ayarla
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.MainButton.text = "✅ Profili Tamamla";
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            // Form submit'i tetikle
            const submitEvent = new Event('submit');
            usernameForm.dispatchEvent(submitEvent);
        });
    }
}

// Profil sayfasını göster
function showProfileSection(userData) {
    loginSection.style.display = 'none';
    usernameSection.style.display = 'none';
    profileSection.style.display = 'block';
    
    userProfile.innerHTML = `
        <div class="profile-info">
            ${userData.photo_url ? `<img src="${userData.photo_url}" alt="Profil" class="profile-photo">` : ''}
            <div class="profile-details">
                <h3>👤 ${userData.username}</h3>
                <p><strong>Ad:</strong> ${userData.first_name} ${userData.last_name || ''}</p>
                <p><strong>Telegram ID:</strong> ${userData.telegram_id}</p>
                <p><strong>Kayıt Tarihi:</strong> ${new Date(userData.created_at).toLocaleDateString('tr-TR')}</p>
            </div>
        </div>
    `;
    
    // Mini App'te ana buton ayarla
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.MainButton.text = "🔄 Kullanıcıları Yenile";
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            loadUsers();
            tg.showAlert("Kullanıcı listesi yenilendi! 📋");
        });
    }
}

// Username oluşturma formu
usernameForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    if (!username) {
        showMessage('Lütfen bir kullanıcı adı girin!', 'error', 'usernameMessage');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/users/complete-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                ...currentTelegramUser,
                username: username 
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`✅ Profil başarıyla oluşturuldu!`, 'success', 'usernameMessage');
            localStorage.setItem('telegramUser', JSON.stringify(data.user));
            setTimeout(() => {
                showProfileSection(data.user);
                loadUsers(); // Kullanıcı listesini yenile
            }, 1500);
        } else {
            showMessage(`❌ ${data.error}`, 'error', 'usernameMessage');
        }
    } catch (error) {
        console.error('Hata:', error);
        showMessage('❌ Sunucu hatası oluştu!', 'error', 'usernameMessage');
    }
});

// Çıkış yap
function logout() {
    localStorage.removeItem('telegramUser');
    currentTelegramUser = null;
    
    // Mini App'te ana buton güncelle
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.MainButton.hide();
    }
    
    loginSection.style.display = 'block';
    usernameSection.style.display = 'none';
    profileSection.style.display = 'none';
    
    showMessage('✅ Başarıyla çıkış yaptınız!', 'success', 'loginMessage');
}

// Kullanıcıları yükle
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/users`);
        const users = await response.json();

        if (users.length === 0) {
            usersListDiv.innerHTML = '<p class="no-users">Henüz kayıtlı kullanıcı yok.</p>';
            return;
        }

        const usersHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <span class="username">👤 ${user.username}</span>
                    <span class="date">📅 ${new Date(user.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <div class="user-id">ID: ${user.id}</div>
            </div>
        `).join('');

        usersListDiv.innerHTML = usersHTML;
    } catch (error) {
        console.error('Kullanıcıları yükleme hatası:', error);
        usersListDiv.innerHTML = '<p class="error">❌ Kullanıcılar yüklenirken hata oluştu!</p>';
    }
}

// Mesaj gösterme fonksiyonu
function showMessage(text, type, targetId = 'message') {
    const messageElement = document.getElementById(targetId);
    if (messageElement) {
        messageElement.textContent = text;
        messageElement.className = `message ${type}`;
        
        // 3 saniye sonra mesajı temizle
        setTimeout(() => {
            messageElement.textContent = '';
            messageElement.className = 'message';
        }, 3000);
    }
} 