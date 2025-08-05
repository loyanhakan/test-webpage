// Authentication utility functions for client-side

/**
 * Verify current session with server
 */
async function verifySession() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return false;
        
        const response = await fetch(`${API_BASE}/api/auth/session`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Session verification failed:', error);
        return false;
    }
}

/**
 * Refresh authentication token
 */
async function refreshAuthToken() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return false;
        
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.token);
            authToken = data.token;
            console.log('✅ Token successfully refreshed');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}

/**
 * Go to protected page
 */
function goToProtectedPage() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        showMessage('❌ Korumalı sayfaya erişmek için giriş yapın!', 'error', 'loginMessage');
        return;
    }
    
    window.location.href = '/protected';
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // If token expired, try to refresh
    if (response.status === 401) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
            // Retry with new token
            const newToken = localStorage.getItem('authToken');
            headers['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, {
                ...options,
                headers
            });
        }
    }
    
    return response;
}

// Add to global scope if needed
if (typeof window !== 'undefined') {
    window.verifySession = verifySession;
    window.refreshAuthToken = refreshAuthToken;
    window.goToProtectedPage = goToProtectedPage;
    window.makeAuthenticatedRequest = makeAuthenticatedRequest;
}