# Sistema di Gestione Scadenza Schede PDF

## 📋 Panoramica
Sistema completo per la gestione della scadenza delle schede di allenamento PDF con indicatori visivi colorati e possibilità di estensione durata.

## 🎯 Funzionalità Implementate

### 1. **Database (Turso)**
**File**: `backend/scripts/add-pdf-expiration.js`

Nuovi campi aggiunti alla tabella `user_pdf_files`:
- `duration_months` (INTEGER, default: 2) - Durata in mesi
- `duration_days` (INTEGER, default: 0) - Durata in giorni aggiuntivi
- `expiration_date` (DATETIME) - Data di scadenza calcolata automaticamente

**Migrazione**:
```bash
node backend/scripts/add-pdf-expiration.js
```
- Aggiorna record esistenti con scadenza di 2 mesi dalla data di upload
- Connessione a Turso database cloud

### 2. **Backend API**
**File**: `backend/routes/pdf.js`

#### Nuove Funzionalità:
- **Upload PDF con durata personalizzata**
  ```javascript
  POST /api/pdf/admin/upload/:userId
  Body: { durationMonths: 2, durationDays: 0 }
  ```
  - Calcola automaticamente `expiration_date`
  - Default: 2 mesi

- **Estensione durata PDF**
  ```javascript
  PUT /api/pdf/admin/extend/:userId
  Body: { additionalMonths: 1, additionalDays: 15 }
  ```
  - Aggiunge mesi/giorni alla scadenza esistente
  - Aggiorna `expiration_date` e `duration_*` fields

- **GET con campi scadenza**
  - Tutti gli endpoint GET ora includono: `expirationDate`, `durationMonths`, `durationDays`

### 3. **Admin Panel - PdfManagement**
**File**: `src/components/admin/PdfManagement.tsx`

#### Features:
✅ **Form Upload con Durata**
- Campi input per mesi e giorni (default: 2 mesi, 0 giorni)
- Invio durata insieme al file PDF

✅ **Sezione Estensione Durata**
- Form collassabile "Estendi Durata Scheda"
- Input separati per mesi e giorni da aggiungere
- Chiamata API `/admin/extend/:userId`

✅ **Indicatori Scadenza**
- Badge colorato con countdown giorni
- Formato: "Scade tra X giorni", "Scaduta X giorni fa", "Scade oggi"
- Data scadenza formattata in italiano

#### Sistema Colori:
- 🟢 **Verde**: > 7 giorni rimanenti (`bg-green-100 text-green-800`)
- 🟡 **Giallo**: 1-7 giorni rimanenti (`bg-yellow-100 text-yellow-800`)
- 🔴 **Rosso**: < 1 giorno / scaduta (`bg-red-100 text-red-800`)

### 4. **Admin Panel - UserManagement**
**File**: `src/components/admin/UserManagement.tsx`

#### Features:
✅ **Badge Scadenza nella Lista Utenti**
- Icona orologio (FiClock) + giorni rimanenti
- Formato compatto: "61g", "7g", "Oggi", "Scaduta"
- Visibile sia desktop che mobile

✅ **Caricamento Dati**
```typescript
interface PdfInfo {
  expirationDate?: string;
  durationMonths?: number;
  durationDays?: number;
}
```
- Carica dati PDF completi per tutti gli utenti al mount
- Funzione `reloadUserPdf(userId)` per aggiornamenti singoli

✅ **Auto-Reload dopo Operazioni**
- Upload PDF → reload automatico
- Delete PDF → reload automatico
- Extend durata → reload automatico

#### Bug Fix Importante:
❌ **Prima**: `if (pdfResponse.data.data)` (accesso errato)
✅ **Dopo**: `if (pdfResponse.data)` (corretto)

`apiCall` ritorna `{ success: true, data: {...} }`, quindi `pdfResponse.data` contiene i dati PDF.

### 5. **User Dashboard - TrainingPlan**
**File**: `src/components/dashboard/TrainingPlan.tsx`

#### Features:
✅ **Countdown Scadenza Utente**
- Badge colorato prominente con messaggio dettagliato
- Esempi messaggi:
  - "Scade tra 61 giorni" (verde)
  - "La scheda scade tra 5 giorni" (giallo)
  - "La scheda scade domani" (giallo)
  - "La scheda scade oggi" (rosso)
  - "Scheda scaduta 3 giorni fa" (rosso)
- Data scadenza formattata sotto il badge

### 6. **Mobile Optimization**

#### ReviewManagement
- Layout responsive (flex-col su mobile, flex-row su desktop)
- Badge orizzontali su mobile, verticali su desktop
- Pulsanti ottimizzati per touch (py-2 su mobile)

#### AdminCMS - Tabs
- Solo icone su mobile (`hidden sm:inline` per testo)
- Icona + testo su schermi ≥ sm
- Tabs equal-width su mobile (`flex-1 sm:flex-initial`)

#### UserManagement
- Tabella desktop (`hidden lg:block`)
- Card system mobile (`lg:hidden`)
- Badge scadenza responsive su entrambe le viste

### 7. **UI/UX Improvements**

#### Clipboard Mobile Fix
```javascript
// Fallback iOS Safari
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (isIOS) {
  const range = document.createRange();
  // ... selezione specifica iOS
}
```
- Gestione clipboard per iOS Safari
- Fallback con `document.execCommand('copy')`
- Alert finale se fallisce

#### Rimozioni
- ❌ Link "Admin CMS" dalla homepage (Hero.tsx)
- ❌ File video intro inutilizzati (`intro.mp4`, `intro2.mp4`)

## 📊 Logica Calcolo Scadenza

### Backend (SQLite/Turso):
```sql
-- Calcolo alla creazione
expiration_date = datetime('now', '+' || durationMonths || ' months', '+' || durationDays || ' days')

-- Estensione
expiration_date = datetime(expiration_date, '+' || additionalMonths || ' months', '+' || additionalDays || ' days')
```

### Frontend:
```typescript
const getDaysUntilExpiration = (expirationDate: string): number => {
  const now = new Date();
  const expiry = new Date(expirationDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
```

## 🔄 Flusso Completo

### Scenario 1: Upload Nuova Scheda
1. Admin seleziona PDF + imposta durata (es: 2 mesi, 15 giorni)
2. POST `/api/pdf/admin/upload/:userId` con `FormData`
3. Backend calcola `expiration_date = now + 2 mesi + 15 giorni`
4. Frontend ricarica dati → mostra badge verde "76g"

### Scenario 2: Estensione Scheda
1. Admin clicca "Estendi Durata Scheda"
2. Inserisce 1 mese, 0 giorni
3. PUT `/api/pdf/admin/extend/:userId`
4. Backend: `new_expiration = old_expiration + 1 mese`
5. Frontend reload → badge aggiornato

### Scenario 3: Visualizzazione Utente
1. Utente accede a Dashboard → Training Plan
2. GET `/api/pdf/my-pdf` include `expirationDate`
3. Calcolo giorni rimanenti
4. Mostra badge colorato: "Scade tra 45 giorni" (verde)

## 🐛 Bug Risolti

### 1. API Response Parsing
**Problema**: `userPdfs[user.id]` sempre `null`
**Causa**: `pdfResponse.data.data` invece di `pdfResponse.data`
**Fix**: Corretto accesso in `loadUsers()` e `reloadUserPdf()`

### 2. PDF State Update
**Problema**: Badge non si aggiorna dopo delete
**Causa**: Mancava `loadPdfInfo()` dopo delete
**Fix**: Aggiunto reload in `handleDelete()`

### 3. TypeScript Errors
**Problema**: `onPdfChange(hasPdf: boolean)` incompatibile con `PdfInfo | null`
**Fix**: Cambiato signature a `onPdfChange?: () => void`

### 4. N+1 Query Problem (2025-10-22)
**Problema**: La pagina admin/users faceva 1 chiamata per la lista utenti + N chiamate (1 per utente) per ottenere i dati PDF
**Causa**: `loadUsers()` chiamava `/api/pdf/admin/user/:userId` per ogni utente in un `Promise.all`
**Impatto**: Lentezza di caricamento, possibili problemi con rate limiting
**Fix**:
- Backend: Modificata query SQL in `/api/admin/users` per includere tutti i campi PDF con LEFT JOIN
- Frontend: Estratti dati PDF direttamente dalla risposta di `/api/admin/users`, rimosso `Promise.all`
- Risultato: Da N+1 chiamate a 1 sola chiamata API

### 5. Durata Negativa e Null Expiration Date (2025-10-22)
**Problema**: Record PDF con `durationDays` negativi e `expirationDate` null causavano errori
**Esempio**: `{durationMonths: 3, durationDays: -3, expirationDate: null}`
**Causa**:
- SQLite `datetime(null, ...)` ritorna sempre `null`
- Modifiche ripetute accumulavano valori negativi senza normalizzazione
**Fix**:
- Aggiunta logica di normalizzazione in `/api/pdf/admin/extend/:userId`
- Se giorni negativi: converte in mesi (30 giorni/mese)
- Se `expirationDate` è null: ricalcola da `now` con durata totale
- Validazione: blocca durate totali negative con errore 400
- Script di fix: `backend/scripts/fix_corrupted_pdfs.js` per correggere record esistenti

## 🛠️ Script Manutenzione

### Fix Record Corrotti
**File**: `backend/scripts/fix_corrupted_pdfs.js`

Corregge record PDF con dati invalidi:
- `expirationDate` null
- `durationDays` negativi
- `durationMonths` negativi

**Esecuzione**:
```bash
cd backend
node scripts/fix_corrupted_pdfs.js
```

**Funzionalità**:
1. Trova tutti i record corrotti
2. Normalizza i giorni negativi convertendoli in mesi
3. Ricalcola `expirationDate` da data corrente
4. Mostra riepilogo delle operazioni

**Output Esempio**:
```
🔧 Starting PDF records fix...
📋 Finding corrupted records...
⚠️  Found 1 corrupted record(s):

  User ID: 40
  File: scheda-allenamento.pdf
  Duration: 3 months, -3 days
  Expiration: NULL

🔨 Fixing records...
  ✅ Fixed record ID 7 (User 40): 2 months, 27 days

📊 Summary:
  ✅ Fixed: 1

🎉 Done!
```

## 📝 Commits Creati

```
b32f51a Remove unused intro video files
c85c2b4 Remove admin CMS link from homepage
84a3bee Improve mobile responsiveness for admin panel
fb417a1 Add expiration countdown to user training plan dashboard
afa81d4 Add PDF expiration tracking and management in admin panel
67f7e72 Add PDF expiration management to backend API
0f1ea94 Add database migration script for PDF expiration tracking
```

## 🚀 Deploy

### Backend
1. Eseguire migrazione database:
   ```bash
   node backend/scripts/add-pdf-expiration.js
   ```
2. Riavviare server backend per caricare nuove route

### Frontend
1. Build: `npm run build`
2. Deploy su Vercel/Netlify

### Verifiche Post-Deploy
- ✅ Migrazione database eseguita
- ✅ API `/admin/extend/:userId` funzionante
- ✅ Badge scadenza visibili in admin
- ✅ Countdown visibile in user dashboard
- ✅ Colori corretti (verde/giallo/rosso)

## 📚 Riferimenti API

### Admin Endpoints
```
GET    /api/pdf/admin/user/:userId      # Include expiration fields
POST   /api/pdf/admin/upload/:userId    # Body: { durationMonths, durationDays }
PUT    /api/pdf/admin/extend/:userId    # Body: { additionalMonths, additionalDays }
DELETE /api/pdf/admin/delete/:userId
```

### User Endpoints
```
GET    /api/pdf/my-pdf                  # Include expirationDate
GET    /api/pdf/download                # Download PDF file
```

## 🎨 Costanti Colori

```typescript
// Verde: > 7 giorni
bg-green-100 text-green-800 border-green-300

// Giallo: 1-7 giorni
bg-yellow-100 text-yellow-800 border-yellow-300

// Rosso: < 1 giorno
bg-red-100 text-red-800 border-red-300
```

---

**Implementato da**: Claude Code
**Data**: 2025-10-02
**Versione**: 1.0.0
