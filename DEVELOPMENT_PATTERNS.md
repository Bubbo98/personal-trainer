# 💡 Development Patterns - Personal Trainer App

Pattern tecnici riusabili testati e validati durante lo sviluppo.

---

## 🔐 Authentication Patterns

### JWT Token Strategy
```javascript
// Token con expiration times differenziate
const normalToken = jwt.sign(
  { userId: user.id, username: user.username },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }  // Admin sessions
);

const loginLinkToken = jwt.sign(
  { userId: user.id, username: user.username },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }  // Direct client access
);
```

**Lezione**: Token duration deve riflettere use case (admin vs client)

### Middleware Chain Pattern
```javascript
// Pattern per permissions granulari
app.use('/api/videos', authenticateToken, verifyActiveUser, videoRoutes);
app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes);
app.use('/api/pdf', authenticateToken, pdfRoutes);

// authenticateToken → Verifica JWT validity
// verifyActiveUser → Check is_active flag
// requireAdmin → Check is_admin flag
```

**Lezione**: Chain middleware da generic a specific (auth → active → role)

### Token Storage Pattern
```typescript
// Frontend: Chiavi localStorage separate per ruoli
const ADMIN_TOKEN_KEY = 'admin_auth_token';
const USER_TOKEN_KEY = 'token';  // or 'dashboard_auth_token'

// Admin
localStorage.setItem(ADMIN_TOKEN_KEY, token);

// User
localStorage.setItem(USER_TOKEN_KEY, token);
```

**Lezione**: Separare token storage per evitare collisioni tra admin/user sessions

---

## 🎨 React Component Patterns

### TypeScript React Icons Fix
```typescript
// Problema: React Icons con TypeScript genera errori
import { FiUser, FiDownload, FiFile } from 'react-icons/fi';

// ❌ ERRATO: Direct usage con props
<FiUser className="w-5 h-5" />  // TypeScript error

// ✅ SOLUZIONE 1: React.createElement
{React.createElement(FiUser as React.ComponentType<{ className?: string }>, {
  className: "w-5 h-5 text-gray-400"
})}

// ✅ SOLUZIONE 2: Wrapper components
const UserIcon = () => React.createElement(FiUser, { className: "w-5 h-5" });
const DownloadIcon = ({ className }) => React.createElement(FiDownload, { className });

<UserIcon />
<DownloadIcon className="w-8 h-8" />
```

### Scroll Restoration Pattern
```typescript
// React Router v7+ richiede scroll restoration manuale
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
};

// App.tsx
<BrowserRouter>
  <ScrollToTop />
  <Routes>...</Routes>
</BrowserRouter>
```

**Lezione**: Hook `useLocation` per detection route changes

### Autoplay Carousel Pattern
```typescript
interface ImageCarouselProps {
  autoplay?: boolean;
  autoplayInterval?: number;
  pauseOnHover?: boolean;
  transitionType?: 'slide' | 'fade';
  enableSwipe?: boolean;
}

// Implementation
useEffect(() => {
  if (!autoplay) return;

  const timer = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, autoplayInterval || 5000);

  return () => clearInterval(timer);
}, [autoplay, autoplayInterval, images.length]);
```

**Lezione**: Autoplay con pause on hover migliora UX, disabilita swipe per transizioni smooth

### Multi-Row Fragment Pattern
```typescript
// Rendering multiple rows in table map
{filteredUsers.map((user) => (
  <React.Fragment key={user.id}>
    <tr>{/* User row */}</tr>
    {selectedUser?.id === user.id && (
      <tr><td colSpan={4}>{/* Expanded panel */}</td></tr>
    )}
  </React.Fragment>
))}
```

**Lezione**: `React.Fragment` permette multi-element return in map senza wrapper DOM

---

## 🗄️ Database Patterns

### Soft Delete Pattern
```sql
-- Meglio di hard delete per audit trail
UPDATE users SET is_active = 0 WHERE id = ?;  -- Preserva dati

-- vs

DELETE FROM users WHERE id = ?;  -- Perde history
```

**Query con soft delete**:
```javascript
// Recupera solo utenti attivi
db.all('SELECT * FROM users WHERE is_active = 1', (err, rows) => {
  // ...
});
```

### Moderation Flags Pattern
```sql
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT 0,      -- Moderazione necessaria
    is_featured BOOLEAN DEFAULT 0,      -- Highlight speciali
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Query pubbliche: solo approvate
SELECT * FROM reviews WHERE is_approved = 1;

-- Query admin: tutte, ordinate per approvazione
SELECT * FROM reviews ORDER BY is_approved ASC, created_at DESC;
```

**Lezione**: Flags separati per moderazione vs highlighting permettono controllo granulare

### Junction Table Pattern
```sql
-- Many-to-many relationship: users ↔ videos
CREATE TABLE user_videos (
    user_id INTEGER,
    video_id INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
```

### Unique Constraint Pattern
```sql
-- Un solo PDF per utente
CREATE TABLE user_pdf_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    UNIQUE(user_id)  -- Constraint unico
);
```

### DateTime Calculation Pattern
```sql
-- SQLite datetime functions per calcoli scadenza
UPDATE user_pdf_files
SET expiration_date = datetime('now', '+' || duration_months || ' months', '+' || duration_days || ' days')
WHERE user_id = ?;

-- Extend expiration
UPDATE user_pdf_files
SET expiration_date = datetime(expiration_date, '+' || ? || ' months', '+' || ? || ' days')
WHERE user_id = ?;
```

**Lezione**: SQLite datetime() supporta operazioni concatenate

### Database Wrapper Pattern (Turso vs SQLite)
```javascript
// Unified API con callback pattern
const db = {
  runCallback: (query, params, callback) => {
    if (useTurso) {
      client.execute({ sql: query, args: params })
        .then(() => callback(null))
        .catch(err => callback(err));
    } else {
      localDb.run(query, params, callback);
    }
  },

  getCallback: (query, params, callback) => {
    if (useTurso) {
      client.execute({ sql: query, args: params })
        .then(result => callback(null, result.rows[0]))
        .catch(err => callback(err, null));
    } else {
      localDb.get(query, params, callback);
    }
  }
};
```

**Lezione**: Wrapper per gestire dual database (local dev + cloud prod)

---

## 🎯 Frontend Patterns

### API URL Construction Pattern
```typescript
// ⚠️ PROBLEMA: process.env.REACT_APP_API_URL include già "/api"
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ❌ ERRATO: Doppio /api
fetch(`${API_URL}/api/pdf/my-pdf`);  // → /api/api/pdf ❌

// ✅ CORRETTO: Nessun prefisso aggiuntivo
fetch(`${API_URL}/pdf/my-pdf`);  // → /api/pdf ✅
```

### Environment-Aware Backend URL
```typescript
// Development: Frontend (3000) + Backend (3002) separati
// Production: Same domain su Vercel

const backendUrl = process.env.NODE_ENV === 'production'
  ? window.location.origin    // Same domain optimization
  : 'http://localhost:3002';  // Development separation

const videoSrc = `${backendUrl}/videos/${video.filePath}`;
```

**Lezione**: Development vs Production hanno architetture diverse

### Real-Time Search Pattern
```typescript
// Client-side filtering fino a ~1000 records
const [searchTerm, setSearchTerm] = useState('');

const filteredUsers = users.filter(user => {
  if (!searchTerm) return true;

  const searchLower = searchTerm.toLowerCase();
  return (
    (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
    user.username.toLowerCase().includes(searchLower) ||
    (user.email && user.email.toLowerCase().includes(searchLower))
  );
});

// UI feedback
{searchTerm && (
  <div className="text-sm text-gray-500">
    {filteredUsers.length} di {users.length} utenti
  </div>
)}
```

**Lezione**: Null checks TypeScript per optional fields, result counter migliora UX

### State Management Pattern - Async Loading
```typescript
// Load PDF status per tutti gli utenti
const [userPdfs, setUserPdfs] = useState<Record<number, PdfInfo | null>>({});

useEffect(() => {
  const loadAllPdfs = async () => {
    const pdfData: Record<number, PdfInfo | null> = {};

    await Promise.all(users.map(async (user) => {
      const pdfResponse = await apiCall(`/pdf/admin/user/${user.id}`);

      // ⚠️ apiCall ritorna { success, data }, non { data: { data } }
      if (pdfResponse.data) {  // ✅ Accesso diretto
        pdfData[user.id] = {
          expirationDate: pdfResponse.data.expirationDate,
          durationMonths: pdfResponse.data.durationMonths
        };
      } else {
        pdfData[user.id] = null;
      }
    }));

    setUserPdfs(pdfData);
  };

  loadAllPdfs();
}, [users]);
```

**Lezione**: API response structure va verificata, non assumere nesting

---

## 📱 Responsive Design Patterns

### Mobile-First Breakpoints
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '450px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      'custom': '850px',
      'custom-lg': '1200px',
      'custom-xl': '1600px',
    }
  }
};
```

### Responsive Text/Icon Sizing
```tsx
// Pattern: Mobile base → Desktop scale
<h1 className="text-3xl sm:text-5xl lg:text-6xl">Title</h1>
<p className="text-base sm:text-lg lg:text-xl">Description</p>
<FiIcon className="w-6 h-6 sm:w-8 sm:h-8" />
<div className="p-3 sm:p-4 md:p-6">Content</div>
```

### Responsive Image System
```tsx
// Multiple images per breakpoint
<img src="/hero-mobile.jpg" className="custom:hidden" />
<img src="/hero-md.jpeg" className="hidden custom:block custom-lg:hidden" />
<img src="/hero-lg.jpeg" className="hidden custom-lg:block custom-xl:hidden" />
<img src="/hero-xl.jpeg" className="hidden custom-xl:block" />
```

### Dual Layout Pattern (Table + Cards)
```tsx
// Desktop: Table layout
<table className="hidden lg:table">
  <thead>...</thead>
  <tbody>
    {users.map(user => (
      <tr key={user.id}>...</tr>
    ))}
  </tbody>
</table>

// Mobile: Card layout
<div className="lg:hidden space-y-4">
  {users.map(user => (
    <div key={user.id} className="card">...</div>
  ))}
</div>
```

### Icon-Only Tabs on Mobile
```tsx
<button className="flex items-center gap-2 flex-1 sm:flex-initial">
  <FiUsers />
  <span className="hidden sm:inline">Utenti</span>  // Testo solo ≥640px
</button>
```

---

## 🔧 File Handling Patterns

### Static File Serving
```javascript
// Express non serve /public automaticamente in produzione
const path = require('path');

app.use('/videos', express.static(path.join(__dirname, '..', 'public', 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, '..', 'public', 'thumbnails')));
app.use('/pdf', express.static(path.join(__dirname, '..', 'public', 'pdf')));
```

### Multer File Upload Pattern
```javascript
const multer = require('multer');

// In-memory storage per BLOB database
const memoryStorage = multer.memoryStorage();

// Disk storage con naming convention
const diskStorage = multer.diskStorage({
  destination: 'public/pdf/',
  filename: (req, file, cb) => {
    const userId = req.params.userId;
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `user_${userId}_${timestamp}_${sanitizedName}`);
  }
});

const upload = multer({
  storage: diskStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }  // 10MB
});

// Usage
app.post('/api/pdf/upload/:userId', upload.single('pdf'), (req, res) => {
  const fileBuffer = req.file.buffer;  // Memory storage
  const filePath = req.file.path;      // Disk storage
});
```

### Base64 Encoding/Decoding (BLOB Storage)
```javascript
// Upload: Buffer → Base64 string
const fileData = req.file.buffer.toString('base64');

db.run(
  'INSERT INTO user_pdf_files (user_id, file_data) VALUES (?, ?)',
  [userId, fileData]
);

// Download: Base64 → Buffer
db.get('SELECT file_data FROM user_pdf_files WHERE user_id = ?', [userId], (err, row) => {
  const fileBuffer = Buffer.from(row.file_data, 'base64');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
  res.send(fileBuffer);
});
```

**Lezione**: Base64 storage in TEXT columns per Turso, aumenta size +33%

---

## 🛡️ Security Patterns

### Rate Limiting (Environment-Aware)
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

**Lezione**: Development needs higher limits per testing

### Input Validation Pattern
```javascript
// Sanitize user input
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

// Validate user data
const validateUser = (req, res, next) => {
  const { username, email } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  next();
};
```

### CORS Configuration
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://tuodominio.com'
    : 'http://localhost:3000',
  credentials: true
}));
```

---

## 🎨 UI/UX Patterns

### Color System - Status Badges
```typescript
// Verde: OK/Safe (>7 giorni)
// Giallo: Warning (1-7 giorni)
// Rosso: Urgent/Expired (<1 giorno)

const getExpirationColorClass = (daysLeft: number): string => {
  if (daysLeft < 1) return 'bg-red-100 text-red-800 border-red-300';
  if (daysLeft < 7) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-green-100 text-green-800 border-green-300';
};

// Dynamic messages
const getExpirationMessage = (daysLeft: number): string => {
  if (daysLeft < 0) return `Scaduta ${Math.abs(daysLeft)} giorni fa`;
  if (daysLeft === 0) return 'Scade oggi';
  if (daysLeft === 1) return 'Scade domani';
  if (daysLeft < 7) return `Scade tra ${daysLeft} giorni`;
  return `Scade tra ${daysLeft} giorni`;
};
```

**Lezione**: Colori universalmente comprensibili + messaggi dinamici migliorano UX

### Empty States Pattern
```tsx
{filteredUsers.length === 0 && (
  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
    {searchTerm
      ? `Nessun utente trovato per "${searchTerm}"`
      : 'Nessun utente disponibile'
    }
  </td>
)}
```

### iOS Safari Clipboard Fix
```javascript
const copyToClipboard = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textarea.setSelectionRange(0, text.length);
  } else {
    textarea.select();
  }

  const successful = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!successful) {
    alert(`Copia manualmente: ${text}`);
  }
};
```

---

## 🌐 Internationalization Pattern

### useTranslation Hook Pattern
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard.welcome')}</h1>
      <p>{t('dashboard.description')}</p>

      {/* Dynamic interpolation */}
      <p>{t('dashboard.expiresIn', { days: 7 })}</p>
    </div>
  );
};
```

### Translation File Structure
```json
{
  "dashboard": {
    "welcome": "Benvenuto",
    "description": "Descrizione...",
    "expiresIn": "Scade tra {{days}} giorni"
  },
  "admin": {
    "users": "Utenti",
    "videos": "Video"
  }
}
```

---

## 📊 Performance Patterns

### Lazy Loading Components
```typescript
import { lazy, Suspense } from 'react';

const AdminCMS = lazy(() => import('./pages/AdminCMS'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<div>Loading...</div>}>
  <Route path="/admin" element={<AdminCMS />} />
</Suspense>
```

### Debounced Search
```typescript
import { useState, useEffect } from 'react';

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  // API call con debounced value
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

---

## 🔄 Migration Patterns

### Dual Database Migration
```javascript
// Script per SQLite locale
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/trainer.db');

db.run(`
  ALTER TABLE user_pdf_files
  ADD COLUMN duration_months INTEGER DEFAULT 2
`);

// Script separato per Turso cloud
const { createClient } = require("@libsql/client");
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

await client.execute(`
  ALTER TABLE user_pdf_files
  ADD COLUMN duration_months INTEGER DEFAULT 2
`);
```

**Lezione**: Separare migration scripts per local vs cloud database

---

**Ultimo aggiornamento**: Ottobre 2025
**Total patterns**: 25+
**Tested in production**: ✅
