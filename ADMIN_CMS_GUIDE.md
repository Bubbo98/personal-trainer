# 🎛️ Admin CMS - Guida Completa

## 🚀 **Accesso al CMS**

### **URL di Accesso**
```
http://localhost:3000/admin
```
**In produzione sarà**: `https://tuodominio.com/admin`

### **Credenziali**
- **Username**: `joshua_admin`
- **Password**: `trainer2025!`

---

## 🏠 **Panoramica del CMS**

Il CMS è diviso in **2 sezioni principali**:

### **📋 Tab "Utenti"**
- Visualizza tutti gli utenti registrati
- Crea nuovi utenti
- Genera link di accesso
- Gestisce permessi video per utente

### **🎬 Tab "Video"**
- Visualizza catalogo completo video
- Crea nuovi video entry nel database
- Mostra statistiche utilizzo

---

## 👥 **Gestione Utenti**

### **✨ Creare Nuovo Utente**

1. **Clicca su "Nuovo Utente"**
2. **Compila il form**:
   - Nome e Cognome
   - Username (unico)
   - Email (unica)
   - Password
3. **Clicca "Crea Utente"**

**Risultato**:
- Utente creato nel database
- **Alert con link di accesso** automatico
- Link valido per 30 giorni

### **🔗 Generare Link di Accesso**

**Per utenti esistenti**:
1. **Trova l'utente** nella lista
2. **Clicca sull'icona link** (🔗) nella colonna Azioni
3. **Link copiato automaticamente** negli appunti

### **🎬 Assegnare Video a Utente**

1. **Clicca "Gestisci"** nella colonna Video
2. **Si espande pannello** con tutti i video disponibili
3. **Per ogni video**:
   - **"Assegna"** → Dà accesso al video
   - **"Revoca"** → Rimuove accesso al video

### **📄 Gestione Schede PDF**

Il sistema permette di caricare schede di allenamento PDF personalizzate per ogni utente con tracciamento scadenza.

#### **Upload Scheda PDF**
1. **Clicca "Gestisci PDF"** nella colonna Azioni
2. **Seleziona file PDF** da caricare
3. **Imposta durata scheda**:
   - **Mesi**: Durata in mesi (default: 2)
   - **Giorni**: Giorni aggiuntivi (default: 0)
4. **Carica**: Il sistema calcola automaticamente la data di scadenza

**Esempio**: 2 mesi + 15 giorni = Scheda valida per 75 giorni dalla data di caricamento

#### **Visualizzazione Stato Scheda**
Ogni utente mostra un **badge colorato** con lo stato della scheda:

- 🟢 **Verde**: Più di 7 giorni rimanenti
  - Formato: "61g", "15g", ecc.
- 🟡 **Giallo**: Tra 1 e 7 giorni rimanenti
  - Formato: "5g", "7g", ecc.
- 🔴 **Rosso**: Scaduta o scade oggi
  - Formato: "Oggi", "Scaduta"

#### **Estendere Durata Scheda**
1. **Apri pannello "Gestisci PDF"**
2. **Clicca "Estendi Durata Scheda"**
3. **Inserisci tempo da aggiungere**:
   - Mesi da aggiungere
   - Giorni da aggiungere
4. **Conferma**: Il sistema aggiorna la data di scadenza

**Esempio**: Scheda scade tra 5 giorni → aggiungi 1 mese → ora scade tra 35 giorni

#### **Eliminare Scheda**
- Click su **icona cestino** per eliminare la scheda PDF dell'utente

### **📊 Informazioni Utente**

Ogni utente mostra:
- **Nome completo** e contatti
- **Data creazione** e ultimo accesso
- **Numero video** assegnati
- **Stato scheda PDF** con countdown scadenza
- **Stato account** (attivo/inattivo)

---

## 🎬 **Gestione Video**

### **✨ Aggiungere Nuovo Video**

1. **Carica fisicamente il file** video in `/public/videos/categoria/`
2. **Nel CMS clicca "Nuovo Video"**
3. **Compila il form**:
   - **Titolo**: Nome video visualizzato
   - **Descrizione**: Testo descrittivo (opzionale)
   - **Percorso File**: `categoria/nome-file.mp4`
   - **Durata**: Secondi totali del video
   - **Categoria**: Seleziona da lista
   - **Thumbnail**: Path immagine anteprima (opzionale)

### **📂 Struttura Directory Video**

```
public/videos/
├── calisthenics/
│   ├── intro.mp4
│   └── advanced.mp4
├── bodyweight/
│   ├── full-workout.mp4
│   └── beginner.mp4
└── recovery/
    ├── post-workout-stretch.mp4
    └── yoga-session.mp4
```

### **🏷️ Categorie Disponibili**

- **calisthenics** - Allenamenti calisthenics
- **bodyweight** - Allenamenti corpo libero
- **recovery** - Recupero e stretching
- **strength** - Allenamenti forza
- **cardio** - Allenamenti cardiovascolari

### **📊 Statistiche Video**

Ogni video mostra:
- **Titolo** e descrizione
- **Categoria** e durata
- **Numero utenti** che hanno accesso
- **Date** creazione/modifica
- **Path file** completo

---

## 🔄 **Workflow Tipico**

### **📋 Scenario: Nuovo Cliente**

1. **Il cliente ti contatta**
2. **Apri CMS** → Tab "Utenti"
3. **Crea nuovo utente** con i suoi dati
4. **Copi il link** dall'alert
5. **Invii link al cliente** via email/WhatsApp
6. **Cliente accede** automaticamente
7. **Assegni video specifici** per il suo programma
8. **Carica scheda PDF** con durata personalizzata (es. 2 mesi)

### **🎬 Scenario: Nuovo Video**

1. **Registri/carichi video** nel tuo studio
2. **Upload file** in `/public/videos/categoria/`
3. **Apri CMS** → Tab "Video"
4. **Crea nuovo video** entry
5. **Assegni video** ai clienti interessati

### **🔧 Scenario: Gestione Permessi**

1. **Apri CMS** → Tab "Utenti"
2. **Trova cliente** nella lista
3. **Clicca "Gestisci"** nella colonna Video
4. **Assegna/Revoca** video secondo necessità

### **📄 Scenario: Gestione Scheda PDF**

1. **Cliente inizia programma** → Carica scheda PDF (2 mesi)
2. **Dopo 1 mese e mezzo** → Badge diventa giallo (pochi giorni rimasti)
3. **Cliente rinnova programma** → Estendi durata di 1-2 mesi
4. **Badge aggiornato** → Torna verde con nuova scadenza
5. **Cliente visualizza** → Countdown aggiornato nella sua dashboard

---

## 🎯 **Vantaggi del CMS**

### **✅ Per Te (Admin)**

- **Zero codice**: Gestisci tutto via interfaccia web
- **Veloci**: Crea utente + link in 30 secondi
- **Sicuro**: Controllo completo accessi
- **Organizzato**: Vista completa utenti e video
- **Flessibile**: Assegna/revoca video istantaneamente

### **✅ Per i Clienti**

- **Semplicità**: Un solo link per accedere
- **Personalizzato**: Solo i loro video visibili
- **Professionale**: Dashboard moderna e pulita
- **Sempre accessibile**: Link valido 30 giorni

---

## 🛠️ **Funzionalità Avanzate**

### **🔍 Ricerca e Filtri**

- **Lista utenti**: Ordinata per data creazione
- **Lista video**: Raggruppata per categoria
- **Statistiche**: Contatori in tempo reale

### **📱 Responsive Design**

- **Desktop**: Interfaccia completa
- **Tablet**: Layout adattato
- **Mobile**: Funzioni essenziali

### **🔒 Sicurezza**

- **Login amministratore**: Protezione accesso CMS
- **Token JWT**: Autenticazione sicura
- **Validazione dati**: Controlli su tutti i form

---

## 📞 **Risoluzione Problemi**

### **❌ Non riesco ad accedere al CMS**

**Verifica**:
- URL corretto: `/admin`
- Credenziali: `joshua_admin` / `trainer2025!`
- Backend attivo su porta 3001

### **❌ Utente creato ma link non funziona**

**Verifica**:
- Backend in esecuzione
- Frontend e backend sulla stessa rete
- Link copiato correttamente (senza spazi)

### **❌ Video non visibile al cliente**

**Verifica**:
1. File video esistente in `/public/videos/`
2. Entry video creata nel CMS
3. Permesso assegnato all'utente
4. Client ha ricaricato la dashboard

### **❌ Scheda PDF non visibile o scadenza errata**

**Verifica**:
1. PDF caricato correttamente (controllo dimensione file)
2. Durata impostata durante upload
3. Badge scadenza visibile in lista utenti
4. Cliente ha ricaricato dashboard per vedere countdown

### **❌ CMS lento o non risponde**

**Soluzioni**:
- Ricarica pagina CMS
- Verifica console browser per errori
- Riavvia backend se necessario

---

## 🎊 **Best Practices**

### **📋 Gestione Utenti**

- **Username significativi**: es. `mario_rossi`, `cliente_palestra`
- **Email reali**: Per future comunicazioni
- **Password sicure**: Anche se non usate dai clienti
- **Link tempestivi**: Invia subito dopo creazione

### **🎬 Gestione Video**

- **Nomi file chiari**: es. `intro-calisthenics.mp4`
- **Categorie coerenti**: Raggruppa logicamente
- **Descrizioni utili**: Aiuta i clienti a capire il contenuto
- **Durate accurate**: Per statistiche corrette

### **🔧 Manutenzione**

- **Backup regolari**: Database SQLite
- **Pulizia periodica**: Rimuovi utenti inattivi
- **Monitor accessi**: Controlla log per problemi
- **Update contenuti**: Mantieni video attuali

---

## 🚀 **Vai in Produzione**

### **🔧 Preparazione**

1. **Rimuovi link admin** dalla homepage
2. **Cambia password** admin in `.env`
3. **Deploy su Vercel** con dominio personalizzato
4. **Test completo** del flusso

### **📤 Deploy Comando**

```bash
# Build e deploy
npm run build
vercel --prod
```

### **🔗 URL Finale**

- **Sito principale**: `https://tuodominio.com`
- **Admin CMS**: `https://tuodominio.com/admin`
- **Cliente dashboard**: `https://tuodominio.com/dashboard/TOKEN`

---

**🎯 Il tuo sistema professionale è pronto!**
**💰 Costo totale: €10/anno per il dominio**
**⚡ Gestisci tutto da un'unica interfaccia web**