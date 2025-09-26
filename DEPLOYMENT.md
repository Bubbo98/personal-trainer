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
# Backend Variables
JWT_SECRET=your-super-secure-jwt-secret-for-production
DB_PATH=./backend/database/app.db
NODE_ENV=production
ADMIN_USERNAME=joshua_admin
ADMIN_PASSWORD=your-secure-admin-password
FRONTEND_URL=https://tuodominio.vercel.app

# Frontend Variables
REACT_APP_API_URL=https://tuodominio.vercel.app/api
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
ADMIN_PASSWORD=new-super-secure-password-2025
```

### **2. JWT Secret Sicuro**
```bash
# Genera secret casuale
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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

- [ ] ✅ Account Vercel configurato
- [ ] ✅ Repository GitHub collegato
- [ ] ✅ Environment variables impostate
- [ ] ✅ Build success locale
- [ ] ✅ Deploy di test funzionante
- [ ] ✅ Admin CMS accessibile
- [ ] ✅ Test creazione utente
- [ ] ✅ Test accesso cliente
- [ ] ✅ Video caricati e funzionanti
- [ ] ✅ Dominio personalizzato configurato
- [ ] ✅ SSL certificate attivo
- [ ] ✅ Password production sicure
- [ ] ✅ Backup database fatto

---

## 🎉 **Go Live!**

Una volta completata la checklist, il tuo sistema è **live e operativo**!

**Costo totale**: €10/anno per il dominio
**Hosting**: Completamente gratuito
**Manutenzione**: Praticamente zero

**Il tuo business digitale è pronto! 🚀**