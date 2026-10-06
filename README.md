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

Requisiti: Node.js ≥ 22, Yarn 1 (frontend) e npm (backend).

```bash
git clone https://github.com/Bubbo98/personal-trainer.git
cd personal-trainer
yarn install                # frontend

cd backend && npm install   # backend (usa backend/.env)
npm run dev                 # API su http://localhost:3001
```

In un altro terminale, dalla root:

```bash
yarn dev                    # sito su http://localhost:3000, /api inoltrato al backend
```

- Area clienti: `http://localhost:3000/dashboard/<token del link personale>`
- Admin: `http://localhost:3000/admin` (credenziali dell'account admin configurato nel backend)

## 📁 **Struttura Progetto**

```
├── index.html              # Pagina Vite (meta SEO di default)
├── src/
│   ├── main.tsx, App.tsx   # Avvio, provider, route (pagine caricate on demand)
│   ├── pages/              # Una pagina per route
│   ├── features/
│   │   ├── dashboard/      # Area clienti (giorni, pesi, video, scheda, check, recensione)
│   │   ├── admin/          # Amministrazione (utenti, check, video, recensioni, integratori)
│   │   └── legal/          # Privacy, termini e cookie come documenti it/en
│   ├── components/         # Header, Footer, Hero… e ui/ (Modal, Toast, Button, campi…)
│   ├── lib/                # Client API, formattazione date, meta pagina, utility
│   ├── locales/{it,en}/    # Traduzioni per namespace (common, public, dashboard, admin)
│   └── test/               # Setup e helper dei test
├── public/                 # Immagini (WebP), icone, robots.txt, sitemap.xml
└── backend/                # API Express (vedi backend/README.md)
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

```env
# Frontend (opzionale): URL delle API. Di default /api sullo stesso dominio
REACT_APP_API_URL=/api
```

Le variabili del backend (JWT_SECRET, Turso, R2, Resend, CRON_SECRET…) sono descritte in `backend/README.md` e `backend/config.js`.
⚠️ Non scrivere mai valori reali di segreti o password in file del repository.

### **🔐 Generazione Chiavi Sicure**
```bash
# Genera nuovo JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Genera password sicura
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📚 **Documentazione**

> **🗺️ INIZIA QUI**: [`DOC_INDEX.md`](./DOC_INDEX.md) - Mappa completa della documentazione

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
# Frontend (root)
yarn dev           # Dev server Vite (porta 3000)
yarn build         # Type-check + build di produzione in build/
yarn test          # Test (Vitest + Testing Library)
yarn lint          # ESLint
yarn preview       # Anteprima della build

# Backend (backend/)
npm run dev        # Dev server con nodemon
npm test           # Test su una copia del database
```

### **Tech Stack**
- **Frontend**: React 19, TypeScript 6, Vite, Tailwind CSS, React Router 7, TanStack Query, i18next (it/en)
- **Test**: Vitest, Testing Library
- **Backend**: Node.js, Express, Turso (libSQL), Cloudflare R2, JWT
- **Deploy**: Vercel

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
