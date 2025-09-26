# 🚀 Deployment Guide - Personal Trainer App

## 🌐 **Deployment su Vercel (Raccomandato)**

### **1. Setup Account Vercel**
```bash
# Installa Vercel CLI
npm i -g vercel

# Login (prima volta)
vercel login
```

### **2. Configurazione Environment Variables**

**Su Vercel Dashboard:**
1. Vai su https://vercel.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi le seguenti variabili:

```env
# Backend Variables - ⚠️ GENERA NUOVE CHIAVI PER PRODUZIONE!
JWT_SECRET=GENERA_NUOVA_CHIAVE_128_CARATTERI_HEX
DB_PATH=./backend/database/app.db
NODE_ENV=production
ADMIN_USERNAME=joshua_admin
ADMIN_PASSWORD=CAMBIA_CON_PASSWORD_SICURA
FRONTEND_URL=https://tuodominio.vercel.app

# Frontend Variables
REACT_APP_API_URL=https://tuodominio.vercel.app/api
```

### **⚠️ SICUREZZA CRITICA - LEGGI PRIMA DEL DEPLOY!**

**Prima di andare in produzione, DEVI generare nuove chiavi sicure:**

```bash
# 1. Genera JWT_SECRET sicuro (128 caratteri hex)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# 2. Genera password admin sicura
node -e "console.log('ADMIN_PASSWORD=' + require('crypto').randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '@Pt2025!')"
```

**Esempio di chiavi generate (NON usare in produzione):**
```env
JWT_SECRET=f8e9a7b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8
ADMIN_PASSWORD=Tr@1n3r_M1l@n0_Pr0duct10n_2025!#$ecur3
```

### **3. Deploy**
```bash
# Deploy di test
vercel

# Deploy in produzione
vercel --prod
```

### **4. Configurazione Dominio Personalizzato**

**Su Vercel Dashboard:**
1. Vai su **Settings** → **Domains**
2. Aggiungi il tuo dominio: `tuodominio.com`
3. Configura DNS secondo le istruzioni Vercel
4. Aggiorna `FRONTEND_URL` con il nuovo dominio

---

## 🔧 **Configurazione Iniziale Post-Deploy**

### **1. Inizializzazione Database**
Il database SQLite verrà creato automaticamente al primo avvio del backend.

### **2. Test Sistema**
1. **Accedi al tuo sito**: `https://tuodominio.com`
2. **Accedi all'Admin CMS**: `https://tuodominio.com/admin`
3. **Login**: `joshua_admin` / `your-password`
4. **Crea utente di test** e verifica funzionamento

### **3. Upload Video**
1. **Carica video** nella directory corretta su Vercel
2. **Usa il CMS** per creare entry nel database
3. **Assegna video** agli utenti

---

## 📁 **Struttura File Vercel**

```
vercel-project/
├── build/                  # Frontend build (React)
├── backend/               # Backend serverless functions
│   ├── server.js         # Main API handler
│   ├── database/         # SQLite database
│   └── routes/           # API routes
├── public/videos/        # Video storage
└── vercel.json          # Vercel configuration
```

---

## 🔒 **Sicurezza in Produzione**

### **1. Cambia Password Default**
```env
ADMIN_PASSWORD=Joshua@PT_Milano_Production_2025!#Secure
```

### **2. JWT Secret Sicuro (128 caratteri)**
```bash
# Genera secret casuale 128 caratteri
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **3. Audit di Sicurezza Pre-Deploy**
```bash
# Test lunghezza JWT_SECRET
node -e "console.log('JWT length:', process.env.JWT_SECRET?.length)"

# Verifica complessità password
node -e "const pwd = process.env.ADMIN_PASSWORD; console.log('Password strong:', /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$/.test(pwd))"

# Security audit dependencies
npm audit

# Test endpoints sicurezza
curl -H "Origin: http://malicious-site.com" https://tuodominio.com/api/health
```

### **3. Rimuovi Link Admin dalla Home**
Commenta o rimuovi il link "Admin CMS" da `src/components/Hero.tsx`

---

## 📊 **Monitoraggio**

### **Logs Vercel**
```bash
# Visualizza logs in tempo reale
vercel logs [deployment-url]
```

### **Analytics**
- Vercel fornisce analytics built-in
- Monitor errori API tramite Vercel Dashboard
- Controlla utilizzo database tramite Admin CMS

---

## 🔄 **Updates e Manutenzione**

### **Deploy Nuove Versioni**
```bash
# Modifica codice
git add -A
git commit -m "Update: description"
git push origin master

# Redeploy automatico su Vercel
```

### **Backup Database**
```bash
# Scarica database locale
vercel env pull .env.local

# Export database (se necessario)
# Il database è incluso nel repo Git
```

---

## 🆘 **Troubleshooting**

### **Build Errors**
```bash
# Build locale per testare
npm run build

# Se fallisce, controlla:
# - TypeScript errors
# - Missing dependencies
# - Environment variables
```

### **API Errors**
```bash
# Controlla logs
vercel logs

# Verifica environment variables
vercel env ls

# Test endpoints localmente
curl https://tuodominio.com/api/health
```

### **Database Issues**
```bash
# Il database SQLite viene ricreato ad ogni deploy
# Assicurati che lo script di inizializzazione funzioni
# Verifica che i file di schema siano inclusi
```

---

## 💰 **Costi**

### **Vercel Free Tier**
- ✅ **100GB Bandwidth/mese**
- ✅ **Unlimited static deployments**
- ✅ **Serverless Function executions**
- ✅ **Custom domain**

### **Se Superi i Limiti**
- **Pro Plan**: $20/mese per team
- **Enterprise**: Custom pricing

### **Dominio**
- **.com**: ~€10/anno
- **.it**: ~€10/anno
- Provider: Namecheap, GoDaddy, etc.

---

## ✅ **Checklist Pre-Go-Live**

### **🔧 Setup Tecnico**
- [ ] ✅ Account Vercel configurato
- [ ] ✅ Repository GitHub collegato
- [ ] ✅ Build success locale
- [ ] ✅ Deploy di test funzionante
- [ ] ✅ Dominio personalizzato configurato
- [ ] ✅ SSL certificate attivo

### **🔐 Sicurezza (CRITICO!)**
- [ ] ✅ JWT_SECRET generato (128 caratteri hex)
- [ ] ✅ ADMIN_PASSWORD cambiato con password complessa
- [ ] ✅ Environment variables produzione impostate
- [ ] ✅ npm audit pulito (no vulnerabilità)
- [ ] ✅ Test security headers (CORS, Helmet)
- [ ] ✅ Rate limiting testato
- [ ] ✅ Link admin rimosso dalla home page

### **🎬 Funzionalità**
- [ ] ✅ Admin CMS accessibile
- [ ] ✅ Test creazione utente
- [ ] ✅ Test accesso cliente
- [ ] ✅ Video caricati e funzionanti
- [ ] ✅ Sistema recensioni operativo
- [ ] ✅ Email notifications (se implementate)

### **📊 Monitoring**
- [ ] ✅ Health check endpoint funzionante
- [ ] ✅ Error logging configurato
- [ ] ✅ Backup database fatto
- [ ] ✅ Analytics Vercel attivate

### **📚 Documentazione**
- [ ] ✅ Credenziali admin documentate (sicure)
- [ ] ✅ Processo backup documentato
- [ ] ✅ Incident response plan pronto
- [ ] ✅ Guida utente completa

---

## 🎉 **Go Live!**

Una volta completata la checklist, il tuo sistema è **live e operativo**!

**Costo totale**: €10/anno per il dominio
**Hosting**: Completamente gratuito
**Manutenzione**: Praticamente zero

**Il tuo business digitale è pronto! 🚀**