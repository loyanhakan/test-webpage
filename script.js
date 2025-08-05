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
    checkExistingSession();
    loadUsers();
};

// Mevcut session kontrolü
function checkExistingSession() {
    const savedUser = localStorage.getItem('telegramUser');
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        currentTelegramUser = userData;
        showProfileSection(userData);
    }
}

// Telegram login callback fonksiyonu
function onTelegramAuth(user) {
    console.log('Telegram auth success:', user);
    currentTelegramUser = user;
    
    // Telegram auth verilerini doğrula
    verifyTelegramAuth(user);
}

// Telegram auth doğrulama
async function verifyTelegramAuth(user) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user)
        });

        const data = await response.json();

        if (response.ok) {
            if (data.isNewUser) {
                // Yeni kullanıcı - username oluşturma formunu göster
                showUsernameForm(user);
            } else {
                // Mevcut kullanıcı - profil sayfasını göster
                localStorage.setItem('telegramUser', JSON.stringify(data.user));
                showProfileSection(data.user);
            }
        } else {
            showMessage('❌ Telegram doğrulama hatası: ' + data.error, 'error', 'loginMessage');
        }
    } catch (error) {
        console.error('Telegram auth hatası:', error);
        showMessage('❌ Sunucu hatası oluştu!', 'error', 'loginMessage');
    }
}

// Username oluşturma formunu göster
function showUsernameForm(telegramUser) {
    loginSection.style.display = 'none';
    usernameSection.style.display = 'block';
    profileSection.style.display = 'none';
    
    welcomeName.textContent = telegramUser.first_name || 'Arkadaş';
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