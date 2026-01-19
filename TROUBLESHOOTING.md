# 🔧 Troubleshooting Guide - Personal Trainer App

Problemi comuni riscontrati durante lo sviluppo e soluzioni testate.

---

## 🚨 Authentication & Authorization

### Problema: Reviews non apparivano sul frontend
**Sintomi**: Reviews create e approvate non visibili nella pagina pubblica

**Root Cause**:
1. Authentication middleware chain mal configurato
2. Tabelle database `reviews` mancanti
3. TypeScript errors nei componenti

**Soluzione**:
```javascript
// Fix middleware chain
app.use('/api/reviews/public', reviewRoutes);  // Public route SENZA auth
app.use('/api/reviews', authenticateToken, verifyActiveUser, reviewRoutes);

// Schema database corretto
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    email TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

// Fix TypeScript in componenti
const { t } = useTranslation();  // Aggiunto hook mancante
```

**Lezione**: Sempre testare la chain completa auth middleware, non solo singoli endpoint

---

### Problema: Token localStorage Key Mismatch
**Sintomi**: Frontend invia `Bearer null`, autenticazione fallisce

**Root Cause**: Componenti usano chiavi diverse per token storage
- Admin usa `'admin_auth_token'`
- User usa `'token'` o `'dashboard_auth_token'`
- Alcuni componenti usavano chiave sbagliata

**Soluzione**:
```typescript
// dashboardUtils.ts
export const STORAGE_KEY = 'dashboard_auth_token';

// Importa in tutti i componenti dashboard
import { STORAGE_KEY } from '../../utils/dashboardUtils';

const token = localStorage.getItem(STORAGE_KEY);
```

**Lezione**: Unificare naming conventions con costanti condivise

---

### Problema: Frontend riceve `Bearer null`
**Sintomi**: API ritorna 401 Unauthorized, console mostra `Authorization: Bearer null`

**Root Cause**: TrainingPlan component usava `localStorage.getItem('token')` invece della chiave corretta

**Soluzione**:
```typescript
// PRIMA (errato)
const token = localStorage.getItem('token');

// DOPO (corretto)
import { STORAGE_KEY } from '../../utils/dashboardUtils';
const token = localStorage.getItem(STORAGE_KEY); // 'dashboard_auth_token'
```

---

## 🗄️ Database Issues

### Problema: Turso BLOB Insert Fallisce
**Sintomi**: `INSERT INTO user_pdf_files` con BLOB type genera errore

**Root Cause**: Turso (libSQL) non supporta BLOB type nativamente per base64 strings

**Soluzione**:
```sql
-- PRIMA (errato)
CREATE TABLE user_pdf_files (
    file_data BLOB NOT NULL
);

-- DOPO (corretto)
CREATE TABLE user_pdf_files (
    file_data TEXT NOT NULL  -- Base64 string
);

-- Migration script
ALTER TABLE user_pdf_files DROP COLUMN file_data;
ALTER TABLE user_pdf_files ADD COLUMN file_data TEXT;
```

**Script migration**: `backend/scripts/update-pdf-table-text.js`

**Lezione**: Turso usa TEXT per base64, non BLOB diretto

---

### Problema: PDF Status sempre `null`
**Sintomi**: `userPdfs[user.id]` sempre `null` nonostante API ritorni dati

**Root Cause**: API response parsing errato
```typescript
// apiCall ritorna: { success: true, data: {...} }
// NON: { data: { data: {...} } }

// ❌ ERRATO: Double nesting
if (pdfResponse.data.data) { ... }

// ✅ CORRETTO: Single nesting
if (pdfResponse.data) {
  pdfData[user.id] = {
    expirationDate: pdfResponse.data.expirationDate  // Accesso diretto
  };
}
```

**Lezione**: Verificare API response structure, non assumere nesting

---

## 🎥 Video Serving Issues

### Problema: Video non accessibili dal frontend
**Sintomi**: 404 Not Found per `/videos/filename.mp4`, percorsi sbagliati

**Root Cause**: Backend non serviva file statici da `/public/videos/`

**Soluzione**:
```javascript
// backend/server.js
const path = require('path');

// Static file middleware
app.use('/videos', express.static(path.join(__dirname, '..', 'public', 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, '..', 'public', 'thumbnails')));
```

**Frontend URL construction**:
```typescript
const backendUrl = process.env.NODE_ENV === 'production'
  ? window.location.origin  // Same domain Vercel
  : 'http://localhost:3002'; // Dev backend port

const videoSrc = `${backendUrl}/videos/${video.filePath}`;
```

**Lezione**: File serving richiede middleware esplicito, non auto-discovery

---

## 🎨 React & TypeScript Issues

### Problema: React Icons TypeScript Errors
**Sintomi**: `Type '{ className: string; }' is not assignable to type 'IntrinsicAttributes'`

**Root Cause**: Incompatibilità TypeScript con React Icons props

**Soluzione**:
```typescript
import { FiUser, FiDownload } from 'react-icons/fi';

// ❌ ERRATO
<FiUser className="w-5 h-5" />

// ✅ CORRETTO: React.createElement pattern
{React.createElement(FiUser as React.ComponentType<{ className?: string }>, {
  className: "w-5 h-5"
})}

// ✅ ALTERNATIVA: Wrapper components
const UserIcon = () => React.createElement(FiUser, { className: "w-5 h-5" });
<UserIcon />
```

**Lezione**: React Icons richiede `createElement` pattern per TypeScript compatibility

---

### Problema: Scroll position mantenuta dopo navigazione
**Sintomi**: Navigazione tra pagine mantiene scroll position precedente

**Root Cause**: React Router v7.9.1 non include scroll restoration automatico

**Soluzione**:
```typescript
// ScrollToTop.tsx
import { useEffect } from 'react';
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

**Lezione**: React Router v7+ richiede scroll restoration manuale

---

### Problema: Tailwind v4 Non Compatibile
**Sintomi**: Build fails con `react-scripts` e Tailwind CSS v4

**Root Cause**: Tailwind v4 alpha non compatibile con Create React App

**Soluzione**:
```bash
# Downgrade a Tailwind v3
npm uninstall tailwindcss
npm install tailwindcss@3.4.1

# Configurazione corretta
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      screens: {
        'custom': '850px',
        'custom-lg': '1200px'
      }
    }
  }
};
```

**Lezione**: Verificare compatibilità versioni prima di upgrade major

---

### Problema: File traduzioni non importabili
**Sintomi**: `Cannot find module 'public/locales/it/translation.json'`

**Root Cause**: File in `/public/locales/` non accessibili da bundler webpack

**Soluzione**:
```bash
# Spostare da public/ a src/
mv public/locales src/locales

# i18n config
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import itTranslation from './locales/it/translation.json';
import enTranslation from './locales/en/translation.json';

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: itTranslation },
    en: { translation: enTranslation }
  }
});
```

**Lezione**: File importati da JS devono essere in `src/`, non `public/`

---

## ⚡ Performance Issues

### Problema: Rate Limiting "Too Many Requests"
**Sintomi**: Frontend riceve 429 durante development, JSON parsing errors

**Root Cause**: Rate limiter `100 req/15min` troppo restrittivo per testing

**Soluzione**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,  // 10x in dev
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

**Lezione**: Rate limiting deve essere environment-aware per permettere testing

---

## 📄 PDF Management Issues

### Problema: Doppio `/api` nell'URL
**Sintomi**: Chiamate API a `/api/api/pdf/my-pdf` falliscono con 404

**Root Cause**: `process.env.REACT_APP_API_URL` include già `/api`

**Soluzione**:
```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ❌ ERRATO
fetch(`${API_URL}/api/pdf/my-pdf`);  // → /api/api/pdf

// ✅ CORRETTO
fetch(`${API_URL}/pdf/my-pdf`);  // → /api/pdf
```

**Lezione**: Verificare sempre base URL before concatenation

---

### Problema: PDF Management panel in fondo alla lista
**Sintomi**: Pannello gestione PDF appare sempre in fondo, non sotto utente selezionato

**Root Cause**: Rendering fuori dal map loop

**Soluzione**:
```typescript
// ❌ PRIMA: Rendering separato
{filteredUsers.map(user => <tr>{user.name}</tr>)}
{selectedUser && <PdfManagement userId={selectedUser.id} />}

// ✅ DOPO: Inline rendering con Fragment
{filteredUsers.map((user) => (
  <React.Fragment key={user.id}>
    <tr>{/* User row */}</tr>
    {selectedUser?.id === user.id && (
      <tr><td colSpan={4}><PdfManagement userId={user.id} /></td></tr>
    )}
  </React.Fragment>
))}
```

**Lezione**: `React.Fragment` in map permette multi-row rendering

---

### Problema: Badge PDF non si aggiorna dopo delete
**Sintomi**: Badge "✓ Scheda" rimane verde dopo eliminazione PDF

**Root Cause**: `setPdfInfo(null)` senza ricaricare dati dal server

**Soluzione**:
```typescript
const handleDelete = async () => {
  await apiCall(`/pdf/admin/delete/${userId}`, { method: 'DELETE' });

  setPdfInfo(null);  // Update local state
  loadPdfInfo();     // ← Aggiunto: reload da server
  onPdfChange?.();   // Trigger parent reload
};
```

**Lezione**: Dopo operazioni (upload/delete/extend) serve reload esplicito

---

## 🔐 Security Issues

### Problema: Chiavi sviluppo in produzione
**Sintomi**: JWT_SECRET predefinito, ADMIN_PASSWORD debole

**Root Cause**: File `.env` con valori development usato anche in produzione

**Soluzione**:
```bash
# Genera chiavi sicure
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# .env.production
JWT_SECRET=<128-char-hex-random>
ADMIN_PASSWORD=ComplexP@ssw0rd!2025
NODE_ENV=production
```

**Pre-deploy checklist**:
- [ ] JWT_SECRET generato (128 char hex)
- [ ] ADMIN_PASSWORD complesso (min 12 char, simboli, numeri)
- [ ] `.env` in `.gitignore`
- [ ] Vercel environment variables configurate

**Lezione**: Mai riusare chiavi development in produzione

---

## 📱 Mobile & Browser Issues

### Problema: iOS Safari clipboard non funziona
**Sintomi**: `document.execCommand('copy')` fallisce su iPhone/iPad

**Root Cause**: iOS Safari richiede `createRange()` + `setSelectionRange()`

**Soluzione**:
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

**Lezione**: iOS Safari clipboard richiede special handling

---

### Problema: Layout mobile non responsive
**Sintomi**: Tabelle overflow su schermi piccoli, testo troppo grande

**Root Cause**: Design desktop-first senza breakpoints mobile

**Soluzione**:
```tsx
// Dual layout: Table (desktop) + Cards (mobile)
<table className="hidden lg:table">...</table>

<div className="lg:hidden space-y-4">
  {users.map(user => (
    <div className="card">...</div>
  ))}
</div>

// Responsive text
<h1 className="text-3xl sm:text-5xl lg:text-6xl">Title</h1>

// Icon-only tabs on mobile
<button className="flex items-center gap-2">
  <FiUsers />
  <span className="hidden sm:inline">Utenti</span>
</button>
```

**Lezione**: Mobile-first design + dual layouts per UI complesse

---

## 🌐 SEO & Deployment Issues

### Problema: Sito non indicizzabile da Google
**Sintomi**: Google Search Console mostra "No sitemap found"

**Root Cause**: Nessuna sitemap.xml, robots.txt blocca tutto

**Soluzione**:
```javascript
// backend/routes/sitemap.js
app.get('/sitemap.xml', (req, res) => {
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'weekly' },
    { url: '/services', priority: '0.9', changefreq: 'monthly' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/contact', priority: '0.7', changefreq: 'monthly' }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages.map(page => `
    <url>
      <loc>https://esercizifacili.com${page.url}</loc>
      <priority>${page.priority}</priority>
      <changefreq>${page.changefreq}</changefreq>
    </url>
  `).join('')}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});
```

**robots.txt**:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard

Sitemap: https://esercizifacili.com/sitemap.xml
```

**Post-deploy actions**:
1. Registrare sito su Google Search Console
2. Inviare sitemap: `https://www.google.com/ping?sitemap=https://esercizifacili.com/sitemap.xml`

**Lezione**: SEO deve essere built-in, non afterthought

---

## 🐛 Git & Deployment Issues

### Problema: Repository GitLab non sincronizzato
**Sintomi**: `git push` fails, remote branch mismatch

**Root Cause**: Remote URL errato, SSH key non configurata

**Soluzione**:
```bash
# Verifica remote
git remote -v

# Update remote URL (HTTPS)
git remote set-url origin https://gitlab.com/username/repo.git

# O setup SSH
ssh-keygen -t ed25519 -C "email@example.com"
cat ~/.ssh/id_ed25519.pub  # Copia in GitLab Settings → SSH Keys

git remote set-url origin git@gitlab.com:username/repo.git

# Test connection
ssh -T git@gitlab.com

# Push con branch tracking
git push -u origin master
```

**Lezione**: Git workflow va definito chiaramente prima di deployment

---

### Problema: Vercel deploy fails
**Sintomi**: Build success ma app crashes su Vercel

**Root Cause**: Environment variables mancanti o errate

**Soluzione**:
```bash
# Vercel Dashboard → Settings → Environment Variables

# Required variables
JWT_SECRET=<production-secret>
ADMIN_PASSWORD=<production-password>
ADMIN_USERNAME=joshua_admin
NODE_ENV=production
FRONTEND_URL=https://tuodominio.com

# Optional (database)
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

**Rebuild dopo changes**:
1. Update environment variables
2. Deployments → Latest → Redeploy
3. Check logs: Deployments → View Function Logs

**Lezione**: Environment variables devono essere configurate PRIMA del deploy

---

## 🧪 Testing & Debugging

### Problema: PDF integrity verification fails
**Sintomi**: PDF downloaded è corrotto, non si apre

**Root Cause**: Base64 encoding/decoding errato

**Debugging**:
```bash
# Verifica file header
head -c 100 /tmp/downloaded.pdf
# Deve iniziare con: %PDF-1.

# Verifica file type
file /tmp/downloaded.pdf
# Output: PDF document, version 1.x

# Verifica dimensione
ls -lh /tmp/downloaded.pdf
# Confronta con dimensione originale (+33% se base64)
```

**Soluzione**:
```javascript
// Encode
const fileData = req.file.buffer.toString('base64');

// Decode
const fileBuffer = Buffer.from(row.file_data, 'base64');

// ⚠️ NON: JSON.parse() o altre trasformazioni
```

**Lezione**: Base64 deve essere puro, senza JSON wrapping o escape

---

## 📊 Database Debugging

### Problema: Query ritorna dati vuoti
**Sintomi**: `SELECT * FROM users` ritorna empty array, ma dati esistono

**Debugging**:
```bash
# Test database diretto (SQLite)
sqlite3 backend/database/trainer.db
.tables
SELECT * FROM users;
.quit

# Test Turso cloud
node -e "
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});
client.execute('SELECT * FROM users').then(r => console.log(r.rows));
"
```

**Common issues**:
- Database file path errato
- Turso credentials mancanti
- Query su tabella sbagliata (dev vs prod)
- Callback pattern errato (db.get vs db.all)

**Lezione**: Testare database diretto PRIMA di debug application code

---

## 🔄 Migration Issues

### Problema: Migration script fails su Turso
**Sintomi**: `ALTER TABLE` works locally, fails on Turso cloud

**Root Cause**: Turso non supporta alcune operazioni (DROP COLUMN, etc)

**Workaround**:
```sql
-- ❌ NON SUPPORTATO su Turso
ALTER TABLE user_pdf_files DROP COLUMN old_field;

-- ✅ ALTERNATIVA: Creare nuova tabella
CREATE TABLE user_pdf_files_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- campi corretti
);

INSERT INTO user_pdf_files_new SELECT id, ... FROM user_pdf_files;
DROP TABLE user_pdf_files;
ALTER TABLE user_pdf_files_new RENAME TO user_pdf_files;
```

**Lezione**: Separare migration scripts per local SQLite vs Turso cloud

---

## 💡 Quick Fixes Reference

### Error: "Cannot read property 'data' of undefined"
→ Check API response structure, potrebbe essere `response.data` invece di `response.data.data`

### Error: "localStorage is not defined"
→ Component rendered server-side, wrap in `useEffect` o check `typeof window !== 'undefined'`

### Error: "404 Not Found" per static files
→ Aggiungi `express.static()` middleware nel backend

### Error: "CORS policy blocked"
→ Configura CORS con origin corretto in `backend/server.js`

### Error: "JWT malformed"
→ Verifica che token sia passato senza spazi: `Bearer ${token}` non `Bearer ${token} `

### Error: "Too Many Requests"
→ Aumenta rate limit in development: `max: process.env.NODE_ENV === 'production' ? 100 : 1000`

### Error: "Unique constraint failed"
→ Record già esistente, usa UPDATE invece di INSERT o DELETE prima

### Warning: "React Hook useEffect has missing dependency"
→ Aggiungi dependency all'array o usa `// eslint-disable-next-line react-hooks/exhaustive-deps`

---

**Ultimo aggiornamento**: Ottobre 2025
**Problemi documentati**: 25+
**Soluzioni testate in produzione**: ✅
