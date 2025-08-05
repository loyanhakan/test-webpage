# Telegram Mini App with JWT Authentication

A complete Telegram Mini App implementation with JWT authentication, protected routes, and session management.

## Features

- 🚀 **Telegram Mini App Integration** - Native Telegram Web App support
- 🔐 **JWT Authentication** - Secure token-based authentication
- 🛡️ **Protected Routes** - Middleware-based route protection
- 🔄 **Automatic Token Refresh** - Seamless session management
- 💾 **PostgreSQL Database** - Persistent user data storage
- 📱 **Responsive Design** - Mobile-first UI design
- ⚡ **Real-time Updates** - Live user management

## Architecture

### Backend Structure
```
├── server.js              # Main server file
├── middleware/
│   └── auth.js            # Authentication middleware
├── routes/
│   ├── auth.js            # Authentication routes
│   └── protected.js       # Protected API routes
├── utils/
│   ├── session.js         # JWT session utilities
│   └── telegramAuth.js    # Telegram verification utilities
└── public/
    ├── protected.html     # Protected page
    └── auth-utils.js      # Client-side auth utilities
```

### Frontend Structure
```
├── index.html             # Main application page
├── script.js              # Main application logic
├── style.css              # Application styles
└── public/
    ├── protected.html     # Protected page
    └── auth-utils.js      # Authentication utilities
```

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /miniapp` - Telegram Mini App authentication
- `POST /complete-profile` - Complete user profile for new users
- `POST /refresh` - Refresh JWT token
- `GET /session` - Verify current session

### Protected Routes (`/api/protected`)
- `GET /profile` - Get user profile (requires auth)
- `GET /settings` - Get user settings (requires auth)
- `GET /dashboard` - Get user dashboard data (requires auth)

### Legacy Routes
- `GET /api/users` - Get all users (public)
- `POST /api/auth/telegram` - Legacy widget auth (deprecated)

## Security Features

### JWT Token Management
- **Secure Token Generation** - Using cryptographically secure secrets
- **Automatic Expiration** - 7-day token expiry
- **Refresh Mechanism** - Automatic token refresh when needed
- **Secure Storage** - Client-side token storage with validation

### Telegram Authentication
- **InitData Verification** - Validates Telegram Web App data
- **Signature Verification** - HMAC-SHA256 signature validation
- **Timestamp Validation** - Prevents replay attacks (24-hour window)
- **Bot Token Security** - Secure bot token handling

### Route Protection
- **Middleware-based Protection** - Express middleware for route security
- **Token Validation** - JWT token verification on protected routes
- **Error Handling** - Comprehensive error responses
- **Session Management** - Automatic session validation

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  telegram_id BIGINT UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  photo_url TEXT,
  auth_date BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

## Installation & Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd telegram-mini-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Environment Variables**
   ```env
   DATABASE_URL=postgresql://username:password@hostname:port/database
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   JWT_SECRET=your_secure_jwt_secret_key_here
   PORT=3000
   NODE_ENV=development
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Telegram Bot Setup

1. **Create Bot with @BotFather**
   - Send `/newbot` to @BotFather
   - Get your bot token

2. **Setup Mini App**
   - Send `/newapp` to @BotFather
   - Provide your deployed URL
   - Configure app settings

3. **Deploy & Test**
   - Deploy to Vercel/Heroku/Railway
   - Test in Telegram app

## Usage Examples

### Client-Side Authentication
```javascript
// Check if user is authenticated
const isAuthenticated = await verifySession();

// Make authenticated API request
const response = await makeAuthenticatedRequest('/api/protected/profile');

// Go to protected page
goToProtectedPage();
```

### Server-Side Protection
```javascript
// Protect routes with middleware
app.use('/api/protected', authenticateToken);

// Manual token verification
const token = extractTokenFromHeader(req.headers.authorization);
const user = verifyToken(token);
```

## Development vs Production

### Development Mode
- Relaxed Telegram validation (warnings only)
- Detailed error messages
- Console logging enabled

### Production Mode
- Strict Telegram validation (required)
- Minimal error exposure
- Performance optimizations

## Security Considerations

1. **Environment Variables** - Never commit secrets to version control
2. **Token Security** - Use strong JWT secrets (256-bit recommended)
3. **HTTPS Required** - Telegram Mini Apps require HTTPS in production
4. **Input Validation** - Validate all user inputs
5. **Rate Limiting** - Consider implementing rate limiting
6. **Session Timeout** - Implement appropriate session timeouts

## Common Issues & Solutions

### Token Refresh Issues
- Ensure JWT_SECRET is consistent
- Check token expiration handling
- Verify refresh endpoint functionality

### Telegram Authentication
- Validate bot token format
- Check Telegram webhook setup
- Ensure HTTPS for production

### Database Connection
- Verify DATABASE_URL format
- Check PostgreSQL version compatibility
- Ensure SSL settings are correct

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file for details