# 📝 Changelog - Personal Trainer App

Tutte le modifiche significative al progetto sono documentate in questo file.

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
