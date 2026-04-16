# Personal Trainer App - Backend Documentation

## 🎯 **Panoramica del Sistema**

Questo backend fornisce un sistema completo per la gestione degli utenti e l'accesso controllato ai video di allenamento personalizzati. Gli utenti possono accedere tramite link personalizzati e visualizzare solo i video assegnati specificamente al loro account.

## 🏗️ **Architettura**

```
Frontend React (Vercel)
    ↓ HTTP/HTTPS
Backend Node.js + Express (Vercel Serverless)
    ↓ SQLite
Database locale con backup su GitHub
    ↓ File system
Video storage in /public/videos/
```

## 🗄️ **Schema Database**

### **Tabelle Principali**

#### `users` - Gestione utenti
```sql
id (PK) | username | email | password_hash | first_name | last_name | is_active | created_at | login_token | token_expires_at
```

#### `videos` - Catalogo video
```sql
id (PK) | title | description | file_path | duration | thumbnail_path | category | is_active | created_at
```

#### `user_video_permissions` - Permessi di accesso
```sql
id (PK) | user_id (FK) | video_id (FK) | granted_at | granted_by | expires_at | is_active
```

#### `user_pdf_files` - Schede PDF personalizzate (Turso)
```sql
id (PK) | user_id (FK) | file_path | original_name | file_size | uploaded_at | updated_at | duration_months | duration_days | expiration_date
```

**Nuovi campi per scadenza schede**:
- `duration_months` (INTEGER, default: 2) - Durata in mesi
- `duration_days` (INTEGER, default: 0) - Giorni aggiuntivi
- `expiration_date` (DATETIME) - Data scadenza calcolata automaticamente

#### `access_logs` - Log degli accessi
```sql
id (PK) | user_id (FK) | video_id (FK) | access_time | ip_address | user_agent | session_duration
```

## 🔧 **Setup e Installazione**

### **1. Installazione Dipendenze**
```bash
cd backend
npm install
```

### **2. Configurazione Environment**
```bash
cp .env.example .env
# Modifica .env con i tuoi valori
```

### **3. Inizializzazione Database**
```bash
npm run init-db
```

### **4. Avvio del Server**
```bash
# Sviluppo
npm run dev

# Produzione
npm start
```

## 🔐 **Sistema di Autenticazione**

### **Flusso di Autenticazione**

1. **Admin crea utente** via API
2. **Sistema genera login link** con JWT token (30 giorni)
3. **Utente clicca link** → `/dashboard/:token`
4. **Frontend autentica** e ottiene session token (7 giorni)
5. **Utente accede ai video** autorizzati

### **Tipi di Token**

- **Login Link Token**: JWT con `type: "login_link"`, expires in 30 giorni
- **Session Token**: JWT standard, expires in 7 giorni

## 📡 **API Endpoints**

### **🔓 Authentication Routes** (`/api/auth`)

#### `POST /api/auth/login`
Login tradizionale con username/password.
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"joshua_admin","password":"trainer2025!"}'
```

#### `POST /api/auth/login-link`
Accesso tramite token link.
```bash
curl -X POST http://localhost:3001/api/auth/login-link \
  -H "Content-Type: application/json" \
  -d '{"token":"JWT_LOGIN_LINK_TOKEN"}'
```

#### `GET /api/auth/verify`
Verifica validità token corrente.
```bash
curl -X GET http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer JWT_TOKEN"
```

### **🎬 Video Routes** (`/api/videos`) - Richiede autenticazione

#### `GET /api/videos`
Ottieni tutti i video accessibili dall'utente.
```bash
curl -X GET http://localhost:3001/api/videos \
  -H "Authorization: Bearer JWT_TOKEN"
```

#### `GET /api/videos/:id`
Dettagli di un video specifico (con logging accesso).
```bash
curl -X GET http://localhost:3001/api/videos/1 \
  -H "Authorization: Bearer JWT_TOKEN"
```

#### `GET /api/videos/categories`
Ottieni categorie disponibili per l'utente.
```bash
curl -X GET http://localhost:3001/api/videos/categories \
  -H "Authorization: Bearer JWT_TOKEN"
```

#### `GET /api/videos/category/:category`
Video filtrati per categoria.
```bash
curl -X GET http://localhost:3001/api/videos/category/calisthenics \
  -H "Authorization: Bearer JWT_TOKEN"
```

### **👨‍💼 Admin Routes** (`/api/admin`) - Richiede admin access

#### `POST /api/admin/users`
Crea nuovo utente e genera login link.
```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "username": "mario_rossi",
    "email": "mario.rossi@email.com",
    "password": "password123",
    "firstName": "Mario",
    "lastName": "Rossi"
  }'
```

#### `GET /api/admin/users`
Lista tutti gli utenti con i relativi dati PDF inclusi (N+1 query optimization).
```bash
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Risposta**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 40,
        "username": "mario_rossi",
        "email": "mario@email.com",
        "firstName": "Mario",
        "lastName": "Rossi",
        "isActive": 1,
        "createdAt": "2025-01-15",
        "lastLogin": "2025-01-20",
        "videoCount": 5,
        "pdf": {
          "id": 7,
          "userId": 40,
          "originalName": "scheda-allenamento.pdf",
          "fileSize": 166748,
          "mimeType": "application/pdf",
          "uploadedAt": "2025-10-02 12:18:29",
          "uploadedBy": "joshua_admin",
          "updatedAt": "2025-10-22 11:54:19",
          "durationMonths": 2,
          "durationDays": 27,
          "expirationDate": "2025-12-15 10:30:00"
        }
      }
    ]
  }
}
```

**Note**:
- Il campo `pdf` è `null` se l'utente non ha una scheda PDF
- Include tutti i dati PDF in una sola query (performance optimization)

#### `POST /api/admin/users/:id/generate-link`
Genera nuovo login link per utente esistente.
```bash
curl -X POST http://localhost:3001/api/admin/users/2/generate-link \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### `POST /api/admin/users/:userId/videos/:videoId`
Assegna video a utente.
```bash
curl -X POST http://localhost:3001/api/admin/users/2/videos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{"expiresAt": "2025-12-31T23:59:59Z"}'
```

#### `DELETE /api/admin/users/:userId/videos/:videoId`
Revoca accesso video da utente.
```bash
curl -X DELETE http://localhost:3001/api/admin/users/2/videos/1 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### `GET /api/admin/videos`
Lista tutti i video (vista admin).
```bash
curl -X GET http://localhost:3001/api/admin/videos \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### `POST /api/admin/videos`
Crea nuovo video entry.
```bash
curl -X POST http://localhost:3001/api/admin/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "title": "Nuovo Allenamento",
    "description": "Descrizione del video",
    "filePath": "category/video-name.mp4",
    "duration": 1200,
    "category": "bodyweight"
  }'
```

### **📄 PDF Routes** (`/api/pdf`) - Gestione Schede

#### `POST /api/pdf/admin/upload/:userId`
Upload scheda PDF per utente con durata personalizzata.
```bash
curl -X POST http://localhost:3001/api/pdf/admin/upload/7 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -F "pdf=@scheda.pdf" \
  -F "durationMonths=2" \
  -F "durationDays=15"
```

#### `GET /api/pdf/admin/user/:userId`
Ottieni info PDF utente (include expiration_date, duration_months, duration_days).
```bash
curl -X GET http://localhost:3001/api/pdf/admin/user/7 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### `PUT /api/pdf/admin/extend/:userId`
Estendi o riduci durata scheda PDF esistente (supporta valori negativi).
```bash
# Estendi di 1 mese e 15 giorni
curl -X PUT http://localhost:3001/api/pdf/admin/extend/7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "additionalMonths": 1,
    "additionalDays": 15
  }'

# Riduci di 10 giorni
curl -X PUT http://localhost:3001/api/pdf/admin/extend/7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "additionalMonths": 0,
    "additionalDays": -10
  }'
```

**Logica di Normalizzazione**:
- Se `durationDays` diventa negativo, sottrae automaticamente dai mesi (30 giorni/mese)
- Previene durate negative totali (ritorna errore 400)
- Se `expirationDate` è `null`, ricalcola da data corrente con la durata totale
- Altrimenti modifica la data esistente

**Esempio Normalizzazione**:
```
Durata attuale: 3 mesi, -3 giorni
Azione: Normalizzazione automatica
Risultato: 2 mesi, 27 giorni
```

#### `DELETE /api/pdf/admin/delete/:userId`
Elimina scheda PDF utente.
```bash
curl -X DELETE http://localhost:3001/api/pdf/admin/delete/7 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### `GET /api/pdf/my-pdf` (User)
Ottieni info scheda PDF personale (include expirationDate).
```bash
curl -X GET http://localhost:3001/api/pdf/my-pdf \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

#### `GET /api/pdf/download` (User & Admin)
Download scheda PDF personale (utente) o di un utente specifico (admin).

**User - Download propria scheda**:
```bash
curl -X GET http://localhost:3001/api/pdf/download \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Admin - Download scheda di un utente specifico**:
```bash
curl -X GET "http://localhost:3001/api/pdf/download?userId=40" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Note di sicurezza**:
- Gli utenti normali possono scaricare SOLO la propria scheda
- Se un utente normale prova a passare `?userId=X`, riceve errore 403 (Access denied)
- L'admin può scaricare la scheda di qualsiasi utente passando il parametro `userId`
- Il controllo admin avviene tramite confronto username con `ADMIN_USERNAME` in .env

## 🎬 **Gestione Video**

### **Struttura Directory Video e Thumbnails**
```
public/
├── videos/
│   ├── palestra/
│   │   └── legPressOrizzontale.mp4
│   ├── calisthenics/
│   │   └── intro.mp4
│   ├── bodyweight/
│   │   └── full-workout.mp4
│   └── recovery/
│       └── post-workout-stretch.mp4
└── thumbnails/
    ├── legPressOrizzontale.png
    ├── intro-calisthenics.jpg
    └── workout-preview.png
```

**Directory thumbnails**:
- Percorso: `/public/thumbnails/`
- URL servito: `http://localhost:3001/thumbnails/nome-file.png`
- Formato: PNG, JPG
- Dimensioni consigliate: 1280x720px (16:9 ratio)
- Configurazione server: `server.js:66` - `app.use('/thumbnails', express.static(...))`

### **Processo di Aggiunta Video**

1. **Upload fisico** del file video in `/public/videos/categoria/`
2. **(Opzionale) Upload thumbnail** in `/public/thumbnails/`
3. **Creazione entry** nel database via `POST /api/admin/videos`
   - Includi campo `thumbnailPath` con nome file (es. `video.png`)
4. **Assegnazione utenti** via `POST /api/admin/users/:userId/videos/:videoId`

### **Visualizzazione Thumbnails**

**Frontend (VideoCard.tsx)**:
- Le thumbnail vengono caricate automaticamente dal campo `thumbnailPath` del video
- URL costruito: `${API_URL}/thumbnails/${video.thumbnailPath}`
- Fallback automatico a sfondo grigio se immagine non esiste
- Effetti hover: overlay scuro + pulsante play animato (scale 1.1x)

**Gestione errori**:
- Se thumbnail non caricabile → nascosta automaticamente
- Pulsante play sempre visibile anche senza thumbnail

## 🔒 **Sicurezza**

### **Misure Implementate**

- ✅ **JWT Authentication** con scadenza
- ✅ **Password hashing** con bcrypt
- ⚠️ **Rate limiting** (Disabilitato - era 100 req/15min)
- ✅ **CORS protection**
- ✅ **Helmet security headers**
- ✅ **Input validation**
- ✅ **Access logging**

**Note Rate Limiting**: Il rate limiting è stato disabilitato per risolvere problemi di "Too many requests" in produzione. Se necessario in futuro, può essere riattivato decommentando le righe 56-61 in `server.js`.

### **Limitazioni Attuali**

- ⚠️ **Video pubblici**: I file video sono accessibili direttamente via URL
- ⚠️ **Admin semplice**: Admin identificato solo da username, no ruoli complessi
- ⚠️ **Single-tenant**: Un admin per tutto il sistema

### **Miglioramenti Futuri**

- 🔜 **Video streaming protetto** con token temporanei
- 🔜 **Sistema ruoli** più granulare
- 🔜 **Multi-tenancy** per più trainer
- 🔜 **Video transcoding** automatico
- 🔜 **Analytics avanzate**

## 📊 **Monitoraggio e Logs**

### **Access Logs**
Ogni accesso video viene loggato con:
- User ID
- Video ID
- Timestamp
- IP Address
- User Agent
- Durata sessione

### **Console Logs**
```bash
# Esempio output server
🚀 Server running on port 3001
📱 Frontend URL: http://localhost:3000
🔒 Environment: development
💾 Database: ./database/app.db

Admin joshua_admin created user: mario_rossi
User mario_rossi accessed video list (1 videos)
Admin joshua_admin granted video 1 access to user 2
User mario_rossi accessed video: Introduzione al Calisthenics
```

## 🚀 **Deployment**

### **Vercel Deployment**
```bash
# 1. Configura vercel.json per serverless functions
# 2. Deploy
vercel --prod
```

### **Environment Variables Production**
```bash
JWT_SECRET=production-super-secret-key
DB_PATH=./database/app.db
NODE_ENV=production
FRONTEND_URL=https://tuodominio.com
ADMIN_USERNAME=joshua_admin
ADMIN_PASSWORD=secure-password-2025
```

## 🔍 **Troubleshooting**

### **Problemi Comuni**

#### Database non trovato
```bash
# Soluzione: Reinizializza database
npm run init-db
```

#### Token JWT invalid
```bash
# Verifica JWT_SECRET in .env
# Verifica scadenza token
# Rigenera login link
```

#### CORS errors
```bash
# Verifica FRONTEND_URL in .env
# Controlla headers delle richieste
```

#### Video non accessibili
```bash
# Verifica permessi utente-video
# Controlla path video nel database vs filesystem
# Verifica autenticazione
```

## 📞 **Support**

Per problemi o domande:
1. Controlla logs del server
2. Verifica configurazione .env
3. Testa endpoint con curl
4. Controlla database con SQLite browser

---

**Sistema creato per Joshua Personal Trainer - 2025**
**Architettura Ultra-Budget: €10/anno per dominio + hosting gratuito**