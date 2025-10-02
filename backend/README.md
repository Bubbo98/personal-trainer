# 🔧 Backend API - Personal Trainer App

Backend Node.js + Express per la gestione del sistema di video personalizzati di Joshua Maurizio.

## 🎯 **Caratteristiche**

- 🔐 **Autenticazione JWT** con doppio livello (admin/utenti)
- 👥 **Gestione Utenti** con sistema di link personalizzati
- 🎬 **API Video** con controllo accessi granulare
- 📊 **Sistema Recensioni** con moderazione
- 🛡️ **Security-first** con rate limiting e validazione
- 💾 **Database SQLite** ultraleggero e performante

## 🚀 **Quick Start**

### **1. Setup Environment**
```bash
cd backend
npm install
cp .env.example .env
```

### **2. Configura .env**
```env
# JWT Secret - GENERA UNA CHIAVE SICURA!
JWT_SECRET=3c6618153b67e5654191362f29bc197d83b57e4b63a16b321597b6a629f0722488d1284e3faf52fd36bb6ea57fa67ad298b41c51a2e05620a45584a6b069ad46

# Database
DB_PATH=./database/app.db

# Server
PORT=3001
NODE_ENV=development

# Admin Credentials - CAMBIA IN PRODUZIONE!
ADMIN_USERNAME=joshua_admin
ADMIN_PASSWORD=Joshua@PT_Milano2025!#Secure

# Frontend URL per CORS
FRONTEND_URL=http://localhost:3000
```

### **3. Inizializza Database**
```bash
npm run init-db
```

### **4. Avvia Server**
```bash
npm run dev
```

## 🔐 **Sistema di Sicurezza**

### **JWT Tokens**
- **Sessione normale**: 7 giorni
- **Login link**: 30 giorni (per clienti)
- **Chiave segreta**: 128 caratteri randomici

### **Password Security**
- **Bcrypt** con salt automatico
- **Validazione** lunghezza minima
- **Rate limiting** per login attempts

### **Rate Limiting**
- **Development**: 1000 richieste/15min
- **Production**: 100 richieste/15min

## 📊 **API Endpoints**

### **🔑 Authentication** (`/api/auth`)

#### `POST /api/auth/login`
Login tradizionale admin
```json
{
  "username": "joshua_admin",
  "password": "Joshua@PT_Milano2025!#Secure"
}
```

#### `POST /api/auth/login-link`
Accesso tramite link personalizzato
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### `GET /api/auth/verify`
Verifica token corrente
```bash
Authorization: Bearer <token>
```

### **🎬 Videos** (`/api/videos`) - Richiede Auth

#### `GET /api/videos`
Lista video per utente autenticato
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Allenamento Base",
      "category": "calisthenics",
      "duration": "15:30",
      "path": "/videos/calisthenics/base.mp4"
    }
  ]
}
```

#### `GET /api/videos/:id`
Dettagli video specifico

#### `GET /api/videos/categories`
Categorie disponibili

### **👥 Admin** (`/api/admin`) - Richiede Admin Auth

#### `POST /api/admin/users`
Crea nuovo utente
```json
{
  "username": "cliente1",
  "email": "cliente@email.com",
  "firstName": "Mario",
  "lastName": "Rossi",
  "password": "password123"
}
```

#### `GET /api/admin/users`
Lista tutti gli utenti

#### `POST /api/admin/users/:id/generate-link`
Genera link personalizzato per cliente

#### `POST /api/admin/users/:userId/videos/:videoId`
Assegna video a utente

### **⭐ Reviews** (`/api/reviews`)

#### `GET /api/reviews/public`
Recensioni pubbliche approvate

#### `POST /api/reviews`
Invia nuova recensione
```json
{
  "author": "Mario Rossi",
  "email": "mario@email.com",
  "rating": 5,
  "content": "Ottimo personal trainer!"
}
```

#### `GET /api/admin/reviews` (Admin only)
Gestisci recensioni in moderazione

### **📄 PDF** (`/api/pdf`) - Gestione Schede

#### `POST /api/pdf/admin/upload/:userId` (Admin only)
Upload scheda PDF con durata personalizzata
```bash
# Form-data upload
pdf: <file>
durationMonths: 2  # default
durationDays: 0    # default
```

#### `GET /api/pdf/admin/user/:userId` (Admin only)
Info PDF utente (include expirationDate, durationMonths, durationDays)

#### `PUT /api/pdf/admin/extend/:userId` (Admin only)
Estendi durata scheda PDF
```json
{
  "additionalMonths": 1,
  "additionalDays": 15
}
```

#### `DELETE /api/pdf/admin/delete/:userId` (Admin only)
Elimina scheda PDF utente

#### `GET /api/pdf/my-pdf` (User)
Info scheda PDF personale (include expirationDate)

#### `GET /api/pdf/download` (User)
Download scheda PDF personale

## 💾 **Database Schema**

### **Tabella Users**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

### **Tabella Videos**
```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT,
    path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabella User_Videos**
```sql
CREATE TABLE user_videos (
    user_id INTEGER,
    video_id INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id),
    PRIMARY KEY (user_id, video_id)
);
```

### **Tabella Reviews**
```sql
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    email TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabella User_PDF_Files** (Turso)
```sql
CREATE TABLE user_pdf_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_months INTEGER DEFAULT 2,
    duration_days INTEGER DEFAULT 0,
    expiration_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Campi scadenza**:
- `duration_months`: Durata in mesi (default: 2)
- `duration_days`: Giorni aggiuntivi (default: 0)
- `expiration_date`: Calcolata come `datetime('now', '+X months', '+Y days')`

## 🛠️ **Scripts Disponibili**

```bash
npm run dev          # Server development con nodemon
npm start            # Server production
npm run init-db      # Inizializza database SQLite
npm test             # Run tests (se presenti)
```

## 🔧 **Middleware**

### **authenticateToken**
Verifica validità JWT token

### **verifyActiveUser**
Controlla che l'utente sia attivo

### **requireAdmin**
Limita accesso solo agli admin

### **Rate Limiting**
Previene spam e attacchi DoS

### **CORS**
Configura accessi cross-origin

### **Helmet**
Headers di sicurezza HTTP

## 🚀 **Deployment**

### **Variabili Produzione**
```env
NODE_ENV=production
JWT_SECRET=<NUOVA_CHIAVE_SICURA>
ADMIN_PASSWORD=<PASSWORD_COMPLESSA>
FRONTEND_URL=https://tuodominio.com
DB_PATH=./database/production.db
```

### **Comandi Deploy**
```bash
# Build per produzione
npm ci --only=production

# Inizializza DB produzione
NODE_ENV=production npm run init-db

# Avvia server
npm start
```

## 📊 **Monitoring**

### **Health Check**
```bash
GET /api/health
```

### **Logs**
- Errori automaticamente loggati
- Rate limiting tracciato
- Accessi database monitorati

## 🔐 **Generazione Chiavi Sicure**

```bash
# JWT Secret (128 char hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Password Admin (32 char base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📞 **Support**

**Joshua Maurizio** - Personal Trainer
- 📧 josh17111991@gmail.com
- 📱 +39 328 206 2823
- 🌐 [Allenamento Funzionale Milano](https://www.allenamentofunzionalemilano.net)

---

⚡ **Backend ultra-performante con architettura security-first**