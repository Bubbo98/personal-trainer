# 🎬 Demo Script - Personal Trainer Video System

## 📋 **Scenario Completo**

Questo script dimostra l'intero flusso: dalla creazione dell'utente all'accesso ai video personalizzati.

---

## 🚀 **Step 1: Preparazione Sistema**

### **A. Avvio Backend**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Output atteso:
# 🚀 Server running on port 3001
# 📱 Frontend URL: http://localhost:3000
# 🔒 Environment: development
# 💾 Database: ./database/app.db
```

### **B. Avvio Frontend**
```bash
# Terminal 2 - Frontend
npm start

# Output atteso:
# Compiled successfully!
# Local: http://localhost:3000
# webpack compiled with warnings
```

---

## 👨‍💼 **Step 2: Login Admin**

### **Ottenere Token Admin**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"joshua_admin","password":"trainer2025!"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "joshua_admin",
      "email": "admin@joshuapt.com",
      "firstName": "Joshua",
      "lastName": "Admin"
    }
  }
}
```

**➡️ Salva il token per i prossimi step!**

---

## 👤 **Step 3: Creazione Utente**

### **Creare Nuovo Cliente**
```bash
# Sostituisci YOUR_ADMIN_TOKEN con il token del step 2
curl -X POST http://localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "username": "maria_ferrari",
    "email": "maria.ferrari@email.com",
    "password": "cliente123",
    "firstName": "Maria",
    "lastName": "Ferrari"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 2,
      "username": "maria_ferrari",
      "email": "maria.ferrari@email.com",
      "firstName": "Maria",
      "lastName": "Ferrari",
      "createdAt": "2025-09-26 09:22:25"
    },
    "loginToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "loginUrl": "http://localhost:3000/dashboard/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**🎯 L'URL `loginUrl` è quello che invierai al cliente!**

---

## 🎬 **Step 4: Assegnazione Video**

### **Verificare Video Disponibili**
```bash
curl -X GET http://localhost:3001/api/admin/videos \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": 1,
        "title": "Introduzione al Calisthenics",
        "filePath": "calisthenics/intro.mp4",
        "category": "calisthenics",
        "userCount": 0
      },
      {
        "id": 2,
        "title": "Workout Completo Corpo Libero",
        "filePath": "bodyweight/full-workout.mp4",
        "category": "bodyweight",
        "userCount": 0
      }
    ]
  }
}
```

### **Assegnare Video al Cliente**
```bash
# Assegna video ID 1 a user ID 2
curl -X POST http://localhost:3001/api/admin/users/2/videos/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Assegna video ID 2 a user ID 2
curl -X POST http://localhost:3001/api/admin/users/2/videos/2 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (per ogni assegnazione):**
```json
{
  "success": true,
  "message": "Video access granted successfully",
  "data": {
    "userId": 2,
    "videoId": 1,
    "grantedBy": "joshua_admin",
    "grantedAt": "2025-09-26T09:22:40.517Z"
  }
}
```

---

## 🔗 **Step 5: Test Accesso Cliente**

### **A. Accesso Tramite Link**

**Scenario**: Il cliente riceve l'email con il link e lo clicca.

1. **Apri nel browser**:
   ```
   http://localhost:3000/dashboard/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Risultato atteso**:
   - Redirect automatico a `/dashboard`
   - Login automatico
   - Visualizzazione dashboard con video assegnati

### **B. Verifica API Diretta**

```bash
# Test del token login-link
curl -X POST http://localhost:3001/api/auth/login-link \
  -H "Content-Type: application/json" \
  -d '{"token":"LOGIN_LINK_TOKEN_FROM_STEP_3"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "SESSION_TOKEN_7_DAYS",
    "user": {
      "id": 2,
      "username": "maria_ferrari",
      "firstName": "Maria"
    }
  }
}
```

### **C. Visualizzare Video del Cliente**

```bash
# Usa il SESSION_TOKEN dalla response precedente
curl -X GET http://localhost:3001/api/videos \
  -H "Authorization: Bearer SESSION_TOKEN_7_DAYS"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": 1,
        "title": "Introduzione al Calisthenics",
        "description": "Video introduttivo sui movimenti base del calisthenics",
        "filePath": "calisthenics/intro.mp4",
        "duration": 900,
        "category": "calisthenics",
        "grantedAt": "2025-09-26 09:22:40"
      },
      {
        "id": 2,
        "title": "Workout Completo Corpo Libero",
        "filePath": "bodyweight/full-workout.mp4",
        "duration": 1800,
        "category": "bodyweight",
        "grantedAt": "2025-09-26 09:22:45"
      }
    ],
    "totalCount": 2
  }
}
```

---

## 🎯 **Step 6: Test Dashboard Completo**

### **Flusso Utente Frontend**

1. **Accesso Dashboard**: `http://localhost:3000/dashboard/TOKEN`

2. **Schermata di Benvenuto**:
   ```
   Benvenuto, Maria!
   Ecco i tuoi video di allenamento personalizzati
   ```

3. **Filtro Categorie**:
   - Tutti (2)
   - calisthenics (1)
   - bodyweight (1)

4. **Video Cards**: Ogni video mostra:
   - Pulsante play centrale
   - Titolo video
   - Descrizione
   - Durata
   - Categoria
   - Data assegnazione

5. **Test Riproduzione**:
   - Click su play → Modale video player
   - Controlli video standard
   - Pulsante chiusura

6. **Statistiche**:
   ```
   Le tue statistiche
   2 Video totali | 2 Categorie | 45 Minuti totali
   ```

---

## 📊 **Step 7: Monitoraggio Accessi**

### **Log Server Console**
Quando il cliente accede, vedrai nei log:

```bash
User maria_ferrari accessed video list (2 videos)
User maria_ferrari accessed video: Introduzione al Calisthenics
User maria_ferrari accessed video: Workout Completo Corpo Libero
```

### **Analytics Database**
```bash
# Gli accessi vengono salvati in access_logs
# Puoi visualizzarli con un browser SQLite su backend/database/app.db
```

---

## 🔄 **Step 8: Gestione Avanzata**

### **A. Generare Nuovo Link**
```bash
# Se il cliente perde il link originale
curl -X POST http://localhost:3001/api/admin/users/2/generate-link \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### **B. Revocare Accesso Video**
```bash
# Rimuove accesso video 1 da user 2
curl -X DELETE http://localhost:3001/api/admin/users/2/videos/1 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### **C. Lista Tutti gli Utenti**
```bash
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📄 **Step 9: Gestione Schede PDF**

### **A. Upload Scheda PDF con Durata**

```bash
# Upload PDF per user ID 2 con durata 2 mesi + 15 giorni
curl -X POST http://localhost:3001/api/pdf/admin/upload/2 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "pdf=@/path/to/scheda-allenamento.pdf" \
  -F "durationMonths=2" \
  -F "durationDays=15"
```

**Response:**
```json
{
  "success": true,
  "message": "PDF uploaded successfully",
  "data": {
    "userId": 2,
    "fileName": "scheda-allenamento.pdf",
    "fileSize": 524288,
    "durationMonths": 2,
    "durationDays": 15,
    "expirationDate": "2025-12-17T10:30:00.000Z"
  }
}
```

### **B. Verificare Info PDF Utente**

```bash
# Ottieni informazioni PDF per user ID 2
curl -X GET http://localhost:3001/api/pdf/admin/user/2 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalName": "scheda-allenamento.pdf",
    "fileSize": 524288,
    "uploadedAt": "2025-10-02T10:30:00.000Z",
    "expirationDate": "2025-12-17T10:30:00.000Z",
    "durationMonths": 2,
    "durationDays": 15
  }
}
```

### **C. Estendere Durata Scheda**

```bash
# Aggiungi 1 mese alla scheda esistente
curl -X PUT http://localhost:3001/api/pdf/admin/extend/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "additionalMonths": 1,
    "additionalDays": 0
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "PDF duration extended successfully",
  "data": {
    "userId": 2,
    "oldExpiration": "2025-12-17T10:30:00.000Z",
    "newExpiration": "2026-01-17T10:30:00.000Z",
    "totalDurationMonths": 3,
    "totalDurationDays": 15
  }
}
```

### **D. Test Dashboard Utente con PDF**

**Scenario Cliente**:
1. Cliente accede alla dashboard con il suo link
2. Dashboard mostra 4 tab organizzate:
   - 📄 **Scheda** (Training Plan con PDF)
   - 🎬 **Video** (video assegnati)
   - ⭐ **Recensioni** (lascia recensione)
   - 💬 **Feedback** (contatta trainer)
3. Va alla tab "Scheda"
4. Visualizza scheda PDF con:
   - Nome file
   - Dimensione
   - Data caricamento
   - **Badge scadenza colorato**:
     - 🟢 Verde: "Scade tra 76 giorni"
     - 🟡 Giallo: "La scheda scade tra 5 giorni"
     - 🔴 Rosso: "La scheda scade oggi"
   - Pulsante download

### **E. Admin Panel - Visualizzazione Badge**

**Vista Admin nella lista utenti**:
```
User: Maria Ferrari
Email: maria.ferrari@email.com
Videos: 2 assegnati
PDF Status: [🟢 76g] ← Badge verde, 76 giorni rimanenti
```

**Quando scadenza si avvicina**:
```
PDF Status: [🟡 5g] ← Badge giallo, 5 giorni rimanenti
```

**Quando scaduta**:
```
PDF Status: [🔴 Scaduta] ← Badge rosso
```

---

## ✅ **Checklist Successo**

- [ ] ✅ Backend avviato correttamente
- [ ] ✅ Frontend caricato senza errori
- [ ] ✅ Login admin funzionante
- [ ] ✅ Utente creato con successo
- [ ] ✅ Login link generato
- [ ] ✅ Video assegnati all'utente
- [ ] ✅ Accesso dashboard dal link
- [ ] ✅ Video visibili nella dashboard
- [ ] ✅ Player video funzionante
- [ ] ✅ **PDF upload funzionante con durata**
- [ ] ✅ **Badge scadenza visibile in admin**
- [ ] ✅ **Countdown visibile in user dashboard**
- [ ] ✅ **Estensione durata PDF funzionante**
- [ ] ✅ **Colori badge corretti (verde/giallo/rosso)**
- [ ] ✅ Logout e re-accesso funzionanti
- [ ] ✅ Log accessi registrati

---

## 🎉 **Risultato Finale**

**Per l'Admin (Joshua)**:
- Sistema completo per gestire clienti
- API per creare utenti e assegnare video
- Monitoraggio accessi in tempo reale
- Link personalizzati per ogni cliente

**Per il Cliente (Maria)**:
- Accesso diretto tramite link email
- Dashboard personalizzata
- Solo video assegnati visibili
- Esperienza utente pulita e intuitiva

**Costi Operativi**:
- €10/anno per dominio
- €0 per hosting (Vercel gratuito)
- **Totale: 83 centesimi al mese!**

---

## 🚨 **Risoluzione Problemi**

### **Backend non si avvia**
```bash
cd backend
npm install
npm run init-db
npm run dev
```

### **Frontend errori di compilazione**
```bash
# Riavvia frontend
npm start
```

### **Token non validi**
```bash
# Rigenera token admin
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"joshua_admin","password":"trainer2025!"}'
```

### **Video non caricano**
- Verifica che i file esistano in `public/videos/`
- Controlla permessi utente-video nel database
- Verifica path video nel database

---

**🎯 Sistema completo e funzionante per Joshua Personal Trainer!**