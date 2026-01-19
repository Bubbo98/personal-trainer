# Configurazione Vercel Analytics

Questa guida ti aiuterà a configurare Vercel Analytics per visualizzare i dati reali nel pannello admin.

## 1. Abilitare Vercel Analytics sul progetto

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Analytics**
4. Abilita **Analytics** (potrebbe richiedere un piano a pagamento per funzionalità avanzate)

Una volta abilitato, Vercel inizierà automaticamente a raccogliere dati grazie al componente `<Analytics />` che abbiamo già aggiunto in `App.tsx`.

## 2. Ottenere le credenziali API

### A. Token Vercel API

1. Vai su [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Clicca su **Create Token**
3. Dai un nome al token (es. "Analytics API")
4. Seleziona lo scope appropriato (almeno lettura per analytics)
5. Copia il token generato

### B. Project ID

1. Vai sul tuo progetto su Vercel
2. Vai su **Settings** → **General**
3. Copia il **Project ID**

### C. Team ID (Opzionale)

Se il progetto è sotto un team Vercel:
1. Vai su **Team Settings**
2. Copia il **Team ID**

## 3. Configurare le variabili d'ambiente

### Backend (locale)

Aggiungi queste variabili al file `backend/.env`:

```bash
# Vercel Analytics
VERCEL_TOKEN=vercel_xxxxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx
# Solo se usi un team:
# VERCEL_TEAM_ID=team_xxxxxxxxxxxxx
```

### Backend (Vercel)

Se il backend è deployato su Vercel:
1. Vai su **Settings** → **Environment Variables**
2. Aggiungi:
   - `VERCEL_TOKEN` = il tuo token API
   - `VERCEL_PROJECT_ID` = il tuo project ID
   - `VERCEL_TEAM_ID` = il tuo team ID (opzionale)

## 4. API Endpoints Vercel Analytics

Il backend utilizza le API di Vercel per recuperare i dati. Ecco la documentazione:

- **Analytics API**: https://vercel.com/docs/rest-api/endpoints#get-analytics
- **Web Vitals API**: https://vercel.com/docs/rest-api/endpoints#get-web-vitals

### Note importanti:

- L'API Vercel Analytics potrebbe richiedere un piano Pro o Enterprise
- I dati potrebbero non essere disponibili immediatamente dopo l'abilitazione
- La struttura delle risposte API potrebbe cambiare; consulta sempre la documentazione ufficiale

## 5. Testing

1. Riavvia il backend dopo aver aggiunto le variabili d'ambiente
2. Accedi al pannello admin
3. Clicca sulla tab "Analytics"
4. Dovresti vedere i dati reali o un messaggio di errore specifico

### Debug

Se vedi un errore:
- Verifica che le credenziali siano corrette
- Controlla i log del backend per dettagli
- Assicurati che Analytics sia abilitato su Vercel
- Verifica di avere il piano Vercel appropriato

## 6. Alternative

Se non vuoi usare l'API di Vercel o hai limiti di piano, puoi:

1. **Usare solo il componente Analytics nel frontend**: I dati saranno visibili solo nella dashboard Vercel
2. **Implementare Google Analytics**: Alternativa gratuita con API più accessibili
3. **Usare altri servizi**: Plausible, Fathom, Umami, ecc.

## 7. Limitazioni

- Le API Vercel potrebbero avere rate limits
- Alcuni dati potrebbero non essere disponibili in tempo reale
- La precisione dipende dal piano Vercel

## Supporto

Per problemi con le API Vercel, consulta:
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Vercel API Reference](https://vercel.com/docs/rest-api)
- [Vercel Support](https://vercel.com/support)
