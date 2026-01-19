# 💪 Personal Trainer App - Joshua Maurizio

Sistema completo per la gestione di video personalizzati per clienti personal trainer con architettura ultra-budget (€10/anno).

## 🎯 **Caratteristiche Principali**

### **Per il Personal Trainer (Admin)**
- 🎛️ **Admin CMS completo** per gestire utenti e video
- 👥 **Creazione utenti** con link di accesso automatici
- 🎬 **Gestione video** con controllo accessi granulare
- 📄 **Gestione schede PDF** con scadenza tracciabile e indicatori colorati
- ⏱️ **Sistema scadenza schede** (verde/giallo/rosso) con estensione durata
- 📊 **Dashboard statistiche** e monitoraggio accessi
- 🔗 **Link personalizzati** per ogni cliente

### **Per i Clienti**
- 🔐 **Accesso diretto** tramite link personalizzato
- 🎬 **Dashboard video** con solo i contenuti assegnati
- 📄 **Scheda PDF personalizzata** con countdown scadenza
- ⏰ **Indicatore scadenza** colorato (verde/giallo/rosso)
- ⭐ **Sistema recensioni** separato in tab dedicata
- 💬 **Feedback system** per comunicare con il trainer
- 📱 **Interfaccia responsive** mobile-friendly con tab ottimizzate
- ⚡ **Player video integrato** con descrizioni complete multilinea
- 📈 **Statistiche personali** di utilizzo

## 🏗️ **Architettura Ultra-Budget**

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + SQLite
- **Hosting**: Vercel (gratuito)
- **Storage**: Video locali in /public
- **Costo totale**: €10/anno (solo dominio)

## 🚀 **Quick Start**

### **1. Clone e Setup**
```bash
git clone https://github.com/Bubbo98/personal-trainer.git
cd personal-trainer
npm install
```

### **2. Backend Setup**
```bash
cd backend
npm install
npm run init-db

# Se aggiorni da versione precedente, esegui migrazione PDF:
node scripts/add-pdf-expiration.js

npm run dev
```

### **3. Frontend Start**
```bash
# In altra terminal
npm start
```

### **4. Accesso Admin CMS**
- URL: `http://localhost:3000/admin`
- Username: `joshua_admin`
- Password: `Joshua@PT_Milano2025!#Secure`

## 📁 **Struttura Progetto**

```
personal-trainer-app/
├── src/
│   ├── components/          # Componenti React riutilizzabili
│   ├── pages/              # Pagine principali (Home, About, Services, etc.)
│   ├── locales/            # File traduzioni (IT/EN)
│   └── utils/              # Utility e helper functions
├── backend/
│   ├── routes/             # API endpoints (auth, videos, admin)
│   ├── middleware/         # Middleware di autenticazione
│   ├── database/           # Schema e script database
│   └── scripts/            # Script di inizializzazione
├── public/
│   ├── videos/             # Storage video organizzato per categorie
│   ├── images/             # Immagini del sito
│   └── assets/             # Altri asset statici
└── docs/                   # Documentazione completa
```

## 🎛️ **Admin CMS**

### **Gestione Utenti**
- ✅ Crea nuovi clienti con form semplice
- ✅ Genera link di accesso automatici (30 giorni validità)
- ✅ Assegna/revoca video specifici per utente (con ricerca)
- ✅ Pagina dettaglio utente con tab Video e PDF
- ✅ Interfaccia semplificata senza espansioni confuse
- ✅ Monitora accessi e statistiche

### **Gestione Video**
- ✅ Aggiungi video al catalogo
- ✅ Organizza per categorie (Calisthenics, Bodyweight, Recovery, etc.)
- ✅ Ricerca video per titolo, categoria o descrizione
- ✅ Descrizioni multilinea con preservazione a capo
- ✅ Controlla statistiche utilizzo
- ✅ Gestisci metadati (titolo, descrizione, durata)

## 🔐 **Sistema di Autenticazione**

### **Flusso Utente**
1. Admin crea utente tramite CMS
2. Sistema genera link personalizzato (JWT 30 giorni)
3. Cliente riceve link via email/WhatsApp
4. Accesso automatico alla dashboard personalizzata
5. Visualizzazione solo video assegnati

### **Sicurezza**
- 🔒 JWT tokens con scadenza
- 🔒 Password hash con bcrypt
- 🔒 Rate limiting API
- 🔒 CORS protection
- 🔒 Input validation

## 📊 **API Endpoints**

### **Autenticazione** (`/api/auth`)
- `POST /login` - Login admin
- `POST /login-link` - Accesso tramite link
- `GET /verify` - Verifica token

### **Video** (`/api/videos`) - Richiede auth
- `GET /` - Lista video utente
- `GET /:id` - Dettagli video specifico
- `GET /categories` - Categorie disponibili

### **Admin** (`/api/admin`) - Richiede admin
- `POST /users` - Crea utente
- `GET /users` - Lista utenti
- `POST /users/:id/generate-link` - Genera link
- `POST /users/:userId/videos/:videoId` - Assegna video
- `GET /videos` - Gestione catalogo video

### **PDF** (`/api/pdf`) - Gestione schede
- `POST /admin/upload/:userId` - Upload PDF con durata (mesi+giorni)
- `GET /admin/user/:userId` - Info PDF (include expirationDate)
- `PUT /admin/extend/:userId` - Estendi durata scheda
- `DELETE /admin/delete/:userId` - Elimina PDF
- `GET /my-pdf` - Info PDF utente (include countdown)
- `GET /download` - Download PDF personale

## 🎬 **Gestione Video**

### **Struttura Directory**
```
public/videos/
├── calisthenics/
│   ├── intro.mp4
│   └── advanced.mp4
├── bodyweight/
│   ├── full-workout.mp4
│   └── beginner.mp4
└── recovery/
    ├── stretching.mp4
    └── yoga.mp4
```

### **Workflow Aggiunta Video**
1. Upload fisico file in `/public/videos/categoria/`
2. Crea entry nel CMS (titolo, path, durata, categoria)
3. Assegna agli utenti tramite interfaccia CMS

## 🚀 **Deployment**

### **Vercel (Consigliato)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Environment Variables**

⚠️ **IMPORTANTE**: Prima del deploy in produzione, genera nuove chiavi sicure!

```env
# Frontend
REACT_APP_API_URL=https://tuodominio.com/api

# Backend - MODIFICA QUESTE CHIAVI PER LA PRODUZIONE!
JWT_SECRET=3c6618153b67e5654191362f29bc197d83b57e4b63a16b321597b6a629f0722488d1284e3faf52fd36bb6ea57fa67ad298b41c51a2e05620a45584a6b069ad46
DB_PATH=./database/app.db
NODE_ENV=production
FRONTEND_URL=https://tuodominio.com
ADMIN_USERNAME=joshua_admin
ADMIN_PASSWORD=Joshua@PT_Milano2025!#Secure
```

### **🔐 Generazione Chiavi Sicure**
```bash
# Genera nuovo JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Genera password sicura
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📚 **Documentazione**

> **🗺️ INIZIA QUI**: [`DOC_INDEX.md`](./DOC_INDEX.md) - Mappa completa della documentazione

### **Quick Reference**
- [`CLAUDE.local.md`](./CLAUDE.local.md) - 🎯 Quick reference per Claude AI (pattern, troubleshooting, API)

### **Guide Tecniche**
- [`DEVELOPMENT_PATTERNS.md`](./DEVELOPMENT_PATTERNS.md) - 💡 Pattern tecnici riusabili (25+ patterns)
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) - 🔧 Risoluzione problemi comuni (25+ issues)
- [`BACKEND_DOCUMENTATION.md`](./BACKEND_DOCUMENTATION.md) - 🗄️ Documentazione API completa
- [`SEO_IMPLEMENTATION.md`](./SEO_IMPLEMENTATION.md) - 🌐 SEO completa (sitemap, meta tags, schema.org)

### **Guide Utente & Admin**
- [`ADMIN_CMS_GUIDE.md`](./ADMIN_CMS_GUIDE.md) - 🎛️ Guida completa utilizzo CMS
- [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) - 🎬 Script demo passo-passo

### **Deployment & Sicurezza**
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - 🚀 Guida deploy in produzione
- [`SECURITY.md`](./SECURITY.md) - 🔐 Guida sicurezza (LEGGI PRIMA DEL DEPLOY!)

### **Storia & Features**
- [`PROJECT_HISTORY.md`](./PROJECT_HISTORY.md) - 📜 Storia sviluppo completa (Fase 1-15)
- [`SCHEDE_EXPIRATION_FEATURE.md`](./SCHEDE_EXPIRATION_FEATURE.md) - 📄 Feature gestione PDF
- [`CHANGELOG.md`](./CHANGELOG.md) - 📝 Storia modifiche e aggiornamenti
- [`ANALYTICS_SETUP.md`](./ANALYTICS_SETUP.md) - 📊 Setup analytics

### **Backend Specifico**
- [`backend/README.md`](./backend/README.md) - ⚙️ Setup backend locale

## 🛠️ **Sviluppo**

### **Scripts Disponibili**
```bash
# Frontend
npm start          # Dev server
npm run build      # Build produzione
npm test           # Run tests

# Backend
npm run dev        # Dev server con nodemon
npm run init-db    # Inizializza database
npm start          # Production server
```

### **Tech Stack**
- **Frontend**: React 19, TypeScript, Tailwind CSS, React Router
- **Backend**: Node.js, Express, SQLite, JWT, bcrypt
- **Build**: Create React App, Webpack
- **Deploy**: Vercel, Serverless Functions

## 📈 **Roadmap**

### **v1.1** (Prossime Features)
- [ ] Video streaming protetto con token
- [ ] Sistema notifiche email
- [ ] Analytics avanzate dashboard
- [ ] Upload video diretto da CMS

### **v2.0** (Future)
- [ ] Multi-tenancy (più trainer)
- [ ] Video transcoding automatico
- [ ] Mobile app dedicata
- [ ] Integrazione pagamenti

## 🤝 **Contribuire**

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## 📄 **Licenza**

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 📞 **Contatti**

**Joshua Maurizio** - Personal Trainer
- 📧 Email: josh17111991@gmail.com
- 📱 WhatsApp: +39 328 206 2823
- 📍 Milano, Italia
- 🌐 [Allenamento Funzionale Milano](https://www.allenamentofunzionalemilano.net)

---

⭐ **Se questo progetto ti è utile, lascia una stella!**

**💰 Sistema completo con costo operativo di soli €10/anno**
**🚀 Pronto per il deploy in produzione**
