# 🔐 Security Guide - Personal Trainer App

Guida completa per la sicurezza dell'applicazione Personal Trainer di Joshua Maurizio.

## 🚨 **CHECKLIST SICUREZZA PRE-PRODUZIONE**

### **✅ OBBLIGATORIO PRIMA DEL DEPLOY**

#### **1. Chiavi e Credenziali**
- [ ] Genera nuovo `JWT_SECRET` (128 caratteri hex)
- [ ] Cambia `ADMIN_PASSWORD` con password complessa
- [ ] Modifica `ADMIN_USERNAME` se necessario
- [ ] Verifica che `.env` NON sia committato in git
- [ ] Aggiorna tutti i `.env.example` con placeholder sicuri

#### **2. Environment Variables**
- [ ] Imposta `NODE_ENV=production`
- [ ] Configura `FRONTEND_URL` con dominio reale
- [ ] Verifica `CORS` per dominio produzione
- [ ] Controlla `Rate Limiting` per produzione (100 req/15min)

#### **3. Database**
- [ ] Backup del database di sviluppo
- [ ] Inizializza database produzione pulito
- [ ] Verifica permissions file database
- [ ] Testa connessioni database

## 🔑 **Generazione Chiavi Sicure**

### **JWT Secret (Consigliato: 128 char hex)**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **Password Admin (Consigliato: 32 char base64)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### **Esempio Chiavi Sicure**
```env
# Esempio di chiavi generate (NON usare in produzione)
JWT_SECRET=f8e9a7b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8a9b2c1d4e6f8
ADMIN_PASSWORD=Tr@1n3r_M1l@n0_2025!#$ecur3
```

## 🛡️ **Sicurezza Implementata**

### **Autenticazione**
- ✅ **JWT Tokens** con scadenza automatica
- ✅ **Bcrypt** per hash password (salt automatico)
- ✅ **Token refresh** sistema doppio livello
- ✅ **Session management** sicuro

### **Autorizzazione**
- ✅ **Role-based access** (Admin/User)
- ✅ **Granular permissions** per video
- ✅ **Resource isolation** per utente
- ✅ **API endpoint protection**

### **Network Security**
- ✅ **CORS** configurato correttamente
- ✅ **Helmet.js** per security headers
- ✅ **Rate Limiting** anti-DDoS
- ✅ **Input validation** su tutti gli endpoint

### **Database Security**
- ✅ **SQL Injection** protection (parametrized queries)
- ✅ **Data sanitization** input/output
- ✅ **Connection pooling** sicuro
- ✅ **Error handling** senza leak dati

## 🚫 **Vulnerabilità Comuni Prevenute**

### **OWASP Top 10 Coverage**

#### **A01: Broken Access Control** ✅
- Middleware di autenticazione su tutti gli endpoint protetti
- Verifica permissions granulari per video
- Isolamento dati tra utenti

#### **A02: Cryptographic Failures** ✅
- JWT secret forte (128 char)
- Bcrypt per password hashing
- HTTPS enforcement (deploy)

#### **A03: Injection** ✅
- Parametrized queries SQLite
- Input validation e sanitization
- No dynamic SQL costruito

#### **A04: Insecure Design** ✅
- Rate limiting implementato
- Error handling sicuro
- Logging appropriato

#### **A05: Security Misconfiguration** ✅
- Helmet.js per headers sicuri
- CORS configurato correttamente
- Environment variables per segreti

#### **A06: Vulnerable Components** ✅
- Dipendenze aggiornate regolarmente
- Security audit tramite npm audit
- Pinning versioni critical deps

#### **A07: Authentication Failures** ✅
- Password policy enforced
- Session timeout configurato
- Brute force protection (rate limiting)

#### **A08: Software Integrity Failures** ✅
- Package-lock.json committato
- Dependencies da registry ufficiali
- Code review process

#### **A09: Logging Failures** ✅
- Error logging implementato
- No sensitive data nei logs
- Monitoring endpoints disponibili

#### **A10: Server-Side Request Forgery** ✅
- No external requests da user input
- Validation URL quando necessario
- Whitelist domini permessi

## 🔍 **Audit di Sicurezza**

### **Comandi Verifica**

#### **1. Dependency Audit**
```bash
npm audit
npm audit fix
```

#### **2. Test Chiavi Environment**
```bash
# Verifica JWT_SECRET length
node -e "console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length)"

# Test password strength
node -e "const pwd = process.env.ADMIN_PASSWORD; console.log('Password complexity:', /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$/.test(pwd))"
```

#### **3. Database Permissions**
```bash
ls -la backend/database/
sqlite3 backend/database/app.db ".tables"
```

### **4. API Security Test**
```bash
# Test rate limiting
for i in {1..105}; do curl -s http://localhost:3001/api/health > /dev/null; echo $i; done

# Test CORS
curl -H "Origin: http://malicious-site.com" http://localhost:3001/api/health

# Test authentication
curl http://localhost:3001/api/videos
```

## 📊 **Monitoring Sicurezza**

### **Endpoint Health Check**
```bash
GET /api/health
```

### **Log Events da Monitorare**
- Login failures multipli
- Rate limit violations
- Database errors
- JWT token errors
- CORS violations

### **Metriche Sicurezza**
- Requests/minute per IP
- Failed authentication attempts
- Error rate per endpoint
- Response times anomali

## 🚨 **Incident Response**

### **In caso di Violazione**

#### **Immediate Actions**
1. **Revoca tokens**: Cambia `JWT_SECRET` immediatamente
2. **Reset passwords**: Cambia `ADMIN_PASSWORD`
3. **Check logs**: Analizza access logs per IP sospetti
4. **Database audit**: Verifica modifiche non autorizzate

#### **Recovery Steps**
1. **Patch vulnerabilità** identificata
2. **Update dependencies** se necessario
3. **Test sistema** completamente
4. **Redeploy** con nuove credenziali
5. **Notifica utenti** se necessario

## 🔒 **Best Practices Ongoing**

### **Manutenzione Regolare**
- [ ] **Monthly**: npm audit e update dipendenze
- [ ] **Quarterly**: Rotate JWT_SECRET e admin password
- [ ] **Annually**: Full security review e penetration test

### **Development Security**
- [ ] Mai committare `.env` files
- [ ] Code review per tutti i security-related changes
- [ ] Test automatici per auth endpoints
- [ ] Sanitize logs da sensitive data

### **Production Monitoring**
- [ ] Setup monitoring per rate limit violations
- [ ] Alert per failed login attempts
- [ ] Database backup automatico
- [ ] SSL/TLS certificate renewal

## 📞 **Security Contact**

Per segnalazioni di vulnerabilità:

**Joshua Maurizio**
- 📧 josh17111991@gmail.com
- 📱 +39 328 206 2823

**Response Time**: 24-48 ore per vulnerabilità critiche

---

⚠️ **La sicurezza è un processo continuo, non un evento one-time!**

🔐 **Mantieni sempre aggiornate le tue credenziali e dipendenze**