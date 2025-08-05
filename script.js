// API base URL
const API_BASE = window.location.origin;

// DOM elementleri
const userForm = document.getElementById('userForm');
const usernameInput = document.getElementById('username');
const messageDiv = document.getElementById('message');
const usersListDiv = document.getElementById('usersList');

// Sayfa yüklendiğinde kullanıcıları yükle
window.onload = function() {
    console.log('Kullanıcı yönetimi sayfası yüklendi!');
    loadUsers();
};

// Kullanıcı ekleme formu
userForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    if (!username) {
        showMessage('Lütfen bir kullanıcı adı girin!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`✅ ${username} başarıyla kaydedildi!`, 'success');
            usernameInput.value = '';
            loadUsers(); // Kullanıcı listesini yenile
        } else {
            showMessage(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Hata:', error);
        showMessage('❌ Sunucu hatası oluştu!', 'error');
    }
});

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
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    // 3 saniye sonra mesajı temizle
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 3000);
} 