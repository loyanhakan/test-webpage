let count = 0;

function incrementCounter() {
    count++;
    document.getElementById('counter').textContent = count;
    
    if (count === 10) {
        alert('Tebrikler! 10 kez tıkladınız! 🎉');
    }
}

// Sayfa yüklendiğinde hoş geldin mesajı
window.onload = function() {
    console.log('Test sayfası başarıyla yüklendi!');
} 