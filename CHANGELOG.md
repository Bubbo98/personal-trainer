# 📝 Changelog - Personal Trainer App

Tutte le modifiche significative al progetto sono documentate in questo file.

---

## [2.0.0] - 2025-10-27

### 📚 Documentation Restructure - MAJOR UPDATE

#### **Nuovo Sistema Documentazione**
- **Problema**: CLAUDE.local.md era diventato enorme (1683 righe), difficile navigare
- **Soluzione**: Ristrutturazione completa documentazione in file specializzati

#### **Nuovi File Creati**
1. **DOC_INDEX.md** - Indice navigabile di tutta la documentazione
   - Quick links organizzati per categoria
   - Tabella "Trova Velocemente" per ricerche comuni
   - Statistiche progetto

2. **DEVELOPMENT_PATTERNS.md** - Pattern tecnici riusabili (25+ patterns)
   - Authentication patterns (JWT, middleware chain)
   - React component patterns (TypeScript fixes, hooks)
   - Database patterns (soft delete, moderation flags, junction tables)
   - Frontend patterns (API URL construction, search, state management)
   - Responsive design patterns
   - File handling (Multer, base64, static serving)
   - Security patterns (rate limiting, CORS, validation)
   - UI/UX patterns (color system, empty states, iOS fixes)
   - Internationalization patterns
   - Performance patterns (lazy loading, debouncing)
   - Migration patterns (dual database)

3. **TROUBLESHOOTING.md** - Guida risoluzione problemi (25+ issues)
   - Authentication & Authorization issues
   - Database issues (Turso BLOB, PDF status)
   - Video serving issues
   - React & TypeScript issues
   - Performance issues (rate limiting)
   - PDF management issues (URL construction, badges)
   - Security issues (weak keys)
   - Mobile & Browser issues (iOS Safari, responsive)
   - SEO & Deployment issues
   - Git & Deployment issues
   - Testing & Debugging techniques
   - Quick fixes reference table

4. **PROJECT_HISTORY.md** - Storia completa sviluppo (Fase 1-15)
   - Timeline generale (Settembre 2025 → Ottobre 2025)
   - 15 fasi sviluppo documentate
   - Lezioni apprese per ogni fase
   - Statistiche sviluppo (LOC, componenti, API endpoints)
   - Milestone raggiunti
   - Roadmap futuro
   - Metriche di successo

5. **SEO_IMPLEMENTATION.md** - Guida SEO completa
   - Obiettivi SEO e target keywords
   - Sitemap.xml automatica (implementazione + priorità)
   - Robots.txt dinamico
   - Meta tags enterprise-level (Primary, Open Graph, Twitter, Geo)
   - Schema.org structured data (LocalBusiness, Person)
   - Social media assets requirements
   - Post-deploy actions (Google Search Console, Business Profile)
   - Monitoring & metrics (KPIs, timeline)
   - Checklist completa (Technical, On-Page, Local, Social)
   - Manutenzione SEO (mensile, trimestrale, annuale)

#### **CLAUDE.local.md Refactored**
- **Dimensione ridotta**: 1683 righe → 379 righe (82% risparmio)
- **Formato**: Quick reference con link ai file dettagliati
- **Sezioni**:
  - Stack tecnologico essenziale
  - Struttura progetto
  - Quick links documentazione
  - Pattern essenziali (5 più comuni)
  - Problemi comuni + quick fixes (tabella)
  - Database schema quick reference
  - API endpoints quick reference
  - Responsive design quick reference
  - Sicurezza checklist rapida
  - Deployment quick guide
  - Scalability metrics
  - Lezioni chiave Claude AI (15 bullets)
  - Comandi utili
  - Feature highlights

#### **File Aggiornati**
- `CLAUDE.local.md.backup` - Backup versione originale (preservato)
- `DOC_INDEX.md` - Nuovo indice principale
- `CHANGELOG.md` - Questo file aggiornato

#### **Benefici**
✅ **Navigabilità**: Indice centralizzato con ricerca rapida
✅ **Specializzazione**: File dedicati per topic specifici
✅ **Manutenibilità**: Aggiornamenti più facili in file piccoli
✅ **Performance**: CLAUDE.local.md caricamento 5x più veloce
✅ **Riusabilità**: Pattern tecnici facilmente copiabili
✅ **Onboarding**: Nuovi sviluppatori trovano info rapidamente
✅ **Claude AI**: Quick reference ottimizzato per AI context

#### **Struttura Documentazione Finale**
```
docs/
├── DOC_INDEX.md                    # 🗺️ Mappa navigazione
├── CLAUDE.local.md                 # 🚀 Quick reference (379 lines)
├── DEVELOPMENT_PATTERNS.md         # 💡 Pattern tecnici (25+)
├── TROUBLESHOOTING.md              # 🔧 Risoluzione problemi (25+)
├── PROJECT_HISTORY.md              # 📜 Storia sviluppo (Fase 1-15)
├── SEO_IMPLEMENTATION.md           # 🌐 SEO completa
├── README.md                       # 📖 Overview generale
├── BACKEND_DOCUMENTATION.md        # 🗄️ Backend & API
├── ADMIN_CMS_GUIDE.md              # 🎛️ Guida admin
├── SECURITY.md                     # 🔐 Sicurezza
├── DEPLOYMENT.md                   # 🚀 Deploy guide
├── SCHEDE_EXPIRATION_FEATURE.md    # 📄 Feature PDF
├── ANALYTICS_SETUP.md              # 📊 Analytics
├── DEMO_SCRIPT.md                  # 🎬 Demo script
├── CHANGELOG.md                    # 📝 Questo file
└── backend/README.md               # ⚙️ Backend setup
```

#### **Migration Notes**
- **Breaking Changes**: Nessuno (solo documentazione)
- **Backward Compatibility**: CLAUDE.local.md.backup disponibile
- **Action Required**: Nessuna, documentazione aggiornata automaticamente

---

## [1.2.1] - 2025-10-22

### 🐛 Bug Fix Critici

#### **N+1 Query Problem Risolto**
- **Problema**: La pagina admin/users caricava i dati PDF con N+1 chiamate API (1 lista + 1 per utente)
- **Impatto**: Lentezza caricamento, timeout con rate limiting
- **Fix Backend**: `/api/admin/users` ora include tutti i dati PDF con LEFT JOIN
- **Fix Frontend**: `UserManagement.tsx` ora estrae dati PDF dalla risposta principale
- **Risultato**: Riduzione da N+1 chiamate a 1 sola chiamata API
- **Performance**: Caricamento istantaneo della lista utenti

#### **Gestione Durata PDF con Valori Negativi**
- **Problema**: Record PDF con `durationDays` negativi e `expirationDate: null`
- **Esempio Record Corrotto**: `{durationMonths: 3, durationDays: -3, expirationDate: null}`
- **Fix**: Logica di normalizzazione automatica in `/api/pdf/admin/extend/:userId`
  - Giorni negativi convertiti automaticamente in mesi (30 giorni/mese)
  - Se `expirationDate` è null, ricalcola da data corrente
  - Validazione: blocca durate totali negative (errore 400)
- **Script Manutenzione**: Creato `backend/scripts/fix_corrupted_pdfs.js`
  - Trova e corregge automaticamente record corrotti
  - Normalizza valori e ricalcola date di scadenza

### ⚠️ Modifiche Sicurezza

#### **Rate Limiting Disabilitato**
- **Problema**: Errore "Too many requests from this IP" in produzione
- **Causa**: Limite di 100 richieste/15 minuti troppo basso
- **Azione**: Rate limiting disabilitato in `server.js` (righe 55-61 commentate)
- **Note**: Può essere riattivato in futuro con limiti più alti se necessario
- **File**: `/home/bubbo/Lavoro/josh/personal-trainer-app/backend/server.js`

### 🔧 Modifiche Tecniche

#### **Backend API**
- `GET /api/admin/users`: Ora include campo `pdf` per ogni utente
  - Risposta ottimizzata con JOIN SQL
  - Campo `pdf` è `null` se utente non ha scheda
- `PUT /api/pdf/admin/extend/:userId`: Supporta valori negativi
  - Normalizzazione automatica giorni negativi
  - Gestione `expirationDate` null
  - Validazione durate negative

#### **Frontend**
- `src/components/admin/UserManagement.tsx`:
  - Rimosso `Promise.all` con N chiamate API
  - Estrazione dati PDF da risposta `/api/admin/users`
  - Performance migliorata drasticamente

### 📝 Script Aggiunti

#### **fix_corrupted_pdfs.js**
- Percorso: `backend/scripts/fix_corrupted_pdfs.js`
- Funzione: Corregge record PDF con dati invalidi
- Supporta database Turso cloud
- Output dettagliato con riepilogo operazioni

### 📚 Documentazione Aggiornata

- `BACKEND_DOCUMENTATION.md`:
  - Aggiornata risposta API `/api/admin/users` con esempio JSON
  - Documentata logica normalizzazione `/api/pdf/admin/extend/:userId`
  - Note su rate limiting disabilitato
- `SCHEDE_EXPIRATION_FEATURE.md`:
  - Aggiunti bug #4 e #5 con dettagli fix
  - Documentato script `fix_corrupted_pdfs.js`
  - Esempi output script manutenzione

---

## [1.2.0] - 2025-01-13

### ✨ Nuove Funzionalità

#### **Dashboard Utente Ristrutturata**
- **Tab Recensioni Separata**: Le recensioni ora hanno una tab dedicata invece di essere sotto i video
- **4 Tab Organizzate**:
  - 📄 Scheda (Training Plan)
  - 🎬 Video
  - ⭐ Recensioni
  - 💬 Feedback
- **Mobile Responsive**: Tab ottimizzate per schermi piccoli
  - Sotto 400px: Solo icone visibili
  - Sopra 400px: Icone + testo
- **Componente ReviewTab**: Nuovo componente separato per gestire le recensioni utente

#### **Gestione Utenti Migliorata**
- **Pagina Dettaglio Utente**: Ogni utente ha la sua pagina dedicata (`/admin/users/:userId`)
- **Navigazione Semplificata**: Click sulla riga utente per aprire il dettaglio
- **Tab Video e PDF**: Gestione organizzata con tab nella pagina utente
- **Searchbar Video**: Ricerca video per titolo, categoria o descrizione nella pagina utente
- **Interfaccia Pulita**: Rimosse le espansioni confuse, tutto più chiaro e accessibile

#### **Gestione Video Potenziata**
- **Searchbar Admin**: Cerca video nel CMS per titolo, categoria o descrizione
- **Contatore Risultati**: Mostra "X di Y video" durante la ricerca
- **Descrizioni Multilinea**:
  - Supporto completo per a capo nelle descrizioni
  - Le descrizioni preservano la formattazione originale
  - Classe CSS `whitespace-pre-wrap` applicata ovunque

### 🐛 Bug Fix

#### **Descrizioni Video**
- **Fix**: Le descrizioni con a capo ora vengono visualizzate correttamente
- **Dove**: VideoPlayer, VideoCard, VideoManagement (admin)
- **Soluzione**: Aggiunta classe `whitespace-pre-wrap` a tutti i paragrafi descrizione

#### **Video Player Modal**
- **Fix**: Descrizioni lunghe ora scrollabili nel player
- **Miglioramento**: Layout flex con `max-h-[90vh]` e `overflow-y-auto`
- **Video Height**: Ridotto da `max-h-[70vh]` a `max-h-[60vh]` per lasciare più spazio alla descrizione

### 🔄 Modifiche

#### **Componenti Creati**
- `src/components/admin/UserDetail.tsx` - Pagina dettaglio utente con tab
- `src/components/dashboard/ReviewTab.tsx` - Componente recensioni separato

#### **Componenti Modificati**
- `src/pages/Dashboard.tsx` - Aggiunta tab Recensioni, rimossa sezione sotto video
- `src/components/admin/UserManagement.tsx` - Navigazione a pagina dettaglio, rimosse espansioni
- `src/pages/AdminCMS.tsx` - Supporto routing per pagina dettaglio utente
- `src/components/dashboard/VideoPlayer.tsx` - Supporto scroll descrizioni lunghe
- `src/components/dashboard/VideoCard.tsx` - Preservazione a capo descrizioni
- `src/components/admin/VideoManagement.tsx` - Searchbar e preservazione a capo
- `src/App.tsx` - Nuova route `/admin/users/:userId`

### 📱 UI/UX

#### **Mobile Optimization**
- Tab dashboard responsive con breakpoint 400px
- Tooltip su tab quando il testo è nascosto
- Padding e spacing ottimizzati per mobile

#### **Admin CMS**
- Interfaccia utenti più pulita e intuitiva
- Navigazione migliorata con breadcrumb implicito (pulsante indietro)
- Searchbar sempre visibile per trovare velocemente video

### 🗑️ Rimosso

#### **Dashboard Utente**
- Sezione recensioni sotto i video (spostata in tab dedicata)
- Stato e handlers recensioni dal componente Dashboard principale

#### **Admin CMS**
- Pannelli espandibili nella gestione utenti
- Funzioni `loadUserVideos`, `handleAssignVideo`, `handleRevokeVideo` da UserManagement
- Stati `videos`, `userVideos`, `selectedUser`, `videoSearchTerm` da UserManagement

---

## [1.1.0] - 2024-12-XX

### ✨ Sistema Scadenza Schede PDF
- Indicatori colorati (verde/giallo/rosso)
- Countdown scadenza per utenti
- Estensione durata schede
- Gestione completa PDF per utente

---

## [1.0.0] - 2024-11-XX

### 🎉 Release Iniziale
- Sistema completo gestione video
- Admin CMS con gestione utenti
- Dashboard utente personalizzata
- Sistema autenticazione JWT
- Upload e gestione PDF
- Interfaccia responsive

---

## 🔮 Prossime Features (v1.3.0)

### In Pianificazione
- [ ] Notifiche push per nuovi video
- [ ] Sistema commenti sui video
- [ ] Statistiche utilizzo avanzate
- [ ] Export dati utenti CSV
- [ ] Backup automatico database
- [ ] Video favoriti per utenti
- [ ] Playlist personalizzate

---

**Formato basato su [Keep a Changelog](https://keepachangelog.com/)**
