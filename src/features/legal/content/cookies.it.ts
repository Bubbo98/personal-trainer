import { SITE_URL } from '../../../lib/usePageMeta';
import type { LegalDoc } from '../types';
import { OWNER } from './owner';

const cookies: LegalDoc = {
  title: 'Cookie Policy',
  subtitle: "Informazioni sull'uso dei cookie e tecnologie simili su questo sito web",
  updated: '2026-07-20',
  sections: [
    {
      title: '1. Cosa sono i Cookie',
      blocks: [
        {
          p: "I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo dell'utente quando visita un sito web. Permettono al sito di riconoscere il dispositivo dell'utente e memorizzare alcune informazioni sulle sue preferenze o azioni.",
        },
        {
          box: [
            {
              list: [
                '**Memorizzazione:** Quando visiti il sito, i cookie vengono salvati sul tuo browser',
                '**Lettura:** Nelle visite successive, il sito può leggere i cookie salvati',
                '**Scadenza:** Ogni cookie ha una data di scadenza dopo la quale viene automaticamente eliminato',
                '**Controllo:** Puoi sempre visualizzare, modificare o eliminare i cookie dalle impostazioni del browser',
              ],
            },
          ],
          title: '🍪 Come Funzionano i Cookie',
          tone: 'blue',
        },
      ],
    },
    {
      title: '2. Titolare del Trattamento',
      blocks: [
        {
          box: [
            { p: `**Denominazione:** ${OWNER.name}` },
            { p: `**Codice Fiscale:** ${OWNER.taxCode}` },
            { p: `**Partita IVA:** ${OWNER.vat}` },
            { p: `**Indirizzo:** ${OWNER.address}` },
            { p: `**Email:** ${OWNER.email}` },
            { p: `**Sito web:** ${SITE_URL}` },
          ],
        },
      ],
    },
    {
      title: '3. Tipi di Cookie Utilizzati',
      blocks: [
        { p: 'Il nostro sito web utilizza diversi tipi di cookie per diverse finalità:' },
        { h3: '🔧 Cookie Tecnici (Necessari)' },
        { p: 'Questi cookie sono essenziali per il funzionamento del sito web e non possono essere disabilitati. Non richiedono consenso secondo la normativa vigente.' },
        {
          table: {
            head: ['Cookie', 'Finalità', 'Durata'],
            rows: [
              ['admin_auth_token', 'Autenticazione amministratore', 'Sessione'],
              ['dashboard_auth_token', 'Autenticazione utente dashboard', '30 giorni'],
              ['react_app_session', 'Funzionamento applicazione React', 'Sessione'],
              ['i18nextLng', 'Preferenza lingua selezionata', '1 anno'],
            ],
          },
        },
        { h3: '⚙️ Cookie di Funzionalità' },
        { p: "Questi cookie migliorano la funzionalità del sito e l'esperienza utente, memorizzando le preferenze." },
        {
          table: {
            head: ['Cookie', 'Finalità', 'Durata'],
            rows: [
              ['video_player_settings', 'Preferenze lettore video (volume, qualità)', '30 giorni'],
              ['user_preferences', 'Preferenze interface utente', '90 giorni'],
              ['theme_preference', 'Modalità chiara/scura (se implementata)', '1 anno'],
            ],
          },
        },
        { h3: '🔗 Cookie di Terze Parti' },
        { p: 'Questi cookie sono impostati da servizi di terze parti integrati nel nostro sito.' },
        { h4: 'Cal.com (Sistema di Prenotazione)' },
        {
          table: {
            head: ['Cookie', 'Finalità', 'Durata'],
            rows: [
              ['cal-session', 'Funzionamento calendario prenotazioni', 'Sessione'],
              ['cal-booking-data', 'Dati temporanei prenotazione', '1 ora'],
            ],
          },
        },
        { p: 'Privacy Policy Cal.com: [https://cal.com/privacy](https://cal.com/privacy)', muted: true },
        { h4: 'Vercel Analytics (Analisi Traffico)' },
        {
          table: {
            head: ['Cookie/Tecnologia', 'Finalità', 'Durata'],
            rows: [
              ['Vercel Analytics', 'Analisi anonima del traffico web, pagine visitate, dispositivi', 'Sessione'],
              ['__vercel_live_token', 'Ottimizzazione performance', 'Sessione'],
            ],
          },
        },
        { p: 'Privacy Policy Vercel: [https://vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy)', muted: true },
        {
          box: [
            {
              p: '**Nota:** Vercel Analytics raccoglie dati anonimi e aggregati sul traffico del sito. Non utilizza cookie persistenti e rispetta la privacy degli utenti senza tracciamento personale.',
            },
          ],
          tone: 'green',
        },
        { h4: 'Google Maps (Mappe Interattive)' },
        {
          table: {
            head: ['Cookie', 'Finalità', 'Durata'],
            rows: [
              ['NID', 'Memorizza preferenze e informazioni utente', '6 mesi'],
              ['CONSENT', 'Stato del consenso cookie Google', '20 anni'],
              ['1P_JAR', 'Raccoglie statistiche e traccia conversioni', '1 mese'],
            ],
          },
        },
        { p: 'Privacy Policy Google: [https://policies.google.com/privacy](https://policies.google.com/privacy)', muted: true },
        { p: '**Dove utilizzato:** Mappa interattiva nella pagina Contatti per mostrare la posizione della palestra.', muted: true },
      ],
    },
    {
      title: "4. Base Giuridica per l'Uso dei Cookie",
      blocks: [
        {
          grid: [
            {
              title: 'Cookie Tecnici',
              tone: 'green',
              blocks: [
                { p: '**Base giuridica:** Legittimo interesse (art. 6, par. 1, lett. f) GDPR' },
                { p: '**Motivo:** Essenziali per il funzionamento del sito' },
                { p: '**Consenso:** Non richiesto' },
              ],
            },
            {
              title: 'Cookie di Funzionalità',
              tone: 'blue',
              blocks: [
                { p: '**Base giuridica:** Consenso (art. 6, par. 1, lett. a) GDPR' },
                { p: '**Motivo:** Miglioramento esperienza utente' },
                { p: '**Consenso:** Richiesto tramite banner' },
              ],
            },
          ],
        },
        {
          box: [
            {
              list: [
                '**GDPR:** Regolamento UE 2016/679',
                '**ePrivacy Directive:** Direttiva 2002/58/CE',
                '**Codice Privacy:** D.Lgs. 196/2003 (modificato)',
                '**Linee Guida:** Provvedimento Garante Privacy 8 maggio 2014',
              ],
            },
          ],
          title: '🏛️ Riferimenti Normativi',
        },
      ],
    },
    {
      title: '5. Come Gestiamo il Consenso',
      blocks: [
        { h3: '🍪 Banner Cookie' },
        { p: 'Al primo accesso al sito, appare un banner informativo che ti permette di:' },
        { list: ['Accettare tutti i cookie', 'Rifiutare i cookie non essenziali', 'Personalizzare le tue preferenze', 'Leggere questa Cookie Policy completa'] },
        { h3: '⚙️ Centro Preferenze' },
        { p: 'Puoi modificare le tue preferenze sui cookie in qualsiasi momento attraverso:' },
        { list: ['Link "Impostazioni Cookie" nel footer del sito', 'Sezione "Preferenze" nel tuo account (se registrato)', 'Impostazioni del browser web'] },
        {
          box: [
            {
              p: 'Il tuo consenso è considerato valido quando è: **libero, specifico, informato e inequivocabile**. Puoi revocarlo in qualsiasi momento con la stessa facilità con cui lo hai dato.',
            },
          ],
          title: '✅ Consenso Valido',
          tone: 'green',
        },
      ],
    },
    {
      title: '6. Come Disabilitare i Cookie',
      blocks: [
        {
          p: "Puoi controllare e gestire i cookie in diversi modi. Ricorda che rimuovere o bloccare i cookie potrebbe influire sulla tua esperienza utente e alcune funzioni del sito potrebbero non funzionare correttamente.",
        },
        { h3: '🌐 Impostazioni Browser' },
        {
          grid: [
            { title: 'Google Chrome', blocks: [{ list: ['Menu → Impostazioni', 'Privacy e sicurezza', 'Cookie e altri dati dei siti', 'Gestisci cookie'], ordered: true }] },
            { title: 'Mozilla Firefox', blocks: [{ list: ['Menu → Preferenze', 'Privacy e sicurezza', 'Cookie e dati dei siti web', 'Gestisci dati'], ordered: true }] },
            { title: 'Safari', blocks: [{ list: ['Preferenze → Privacy', 'Gestisci dati siti web', 'Rimuovi tutto/singoli'], ordered: true }] },
            { title: 'Microsoft Edge', blocks: [{ list: ['Menu → Impostazioni', 'Privacy, ricerca e servizi', 'Cookie e autorizzazioni sito', 'Gestisci cookie'], ordered: true }] },
          ],
        },
        { h3: '🕵️ Navigazione Privata/Incognito' },
        { p: 'La modalità di navigazione privata non salva cookie, cronologia o dati temporanei:' },
        {
          list: [
            '**Chrome:** Ctrl+Shift+N (Windows) / Cmd+Shift+N (Mac)',
            '**Firefox:** Ctrl+Shift+P (Windows) / Cmd+Shift+P (Mac)',
            '**Safari:** Cmd+Shift+N',
            '**Edge:** Ctrl+Shift+N',
          ],
        },
        { h3: '📱 Dispositivi Mobile' },
        {
          grid: [
            { title: 'iOS (iPhone/iPad)', blocks: [{ list: ['Impostazioni → Safari', 'Privacy e sicurezza', 'Blocca tutti i cookie', 'Cancella dati siti web'], ordered: true }] },
            { title: 'Android', blocks: [{ list: ['Chrome → Menu → Impostazioni', 'Impostazioni sito', 'Cookie', 'Attiva/Disattiva'], ordered: true }] },
          ],
        },
        {
          box: [
            {
              p: "Disabilitando tutti i cookie, alcune funzionalità del sito potrebbero non funzionare correttamente, come l'accesso all'area riservata, le preferenze salvate e la funzionalità di prenotazione.",
            },
          ],
          title: '⚠️ Attenzione',
          tone: 'amber',
        },
      ],
    },
    {
      title: '7. Gestione Cookie di Terze Parti',
      blocks: [
        { p: 'Alcuni servizi integrati nel nostro sito utilizzano cookie propri. Puoi gestirli direttamente attraverso le impostazioni di questi servizi:' },
        {
          grid: [
            {
              title: 'Cal.com (Prenotazioni)',
              blocks: [
                { p: 'Sistema di prenotazione appuntamenti integrato nelle pagine Servizi e Booking.', muted: true },
                { list: ['Cookie per funzionamento calendario', 'Preferenze fuso orario', 'Dati temporanei prenotazione'] },
                { p: '[Privacy Policy →](https://cal.com/privacy) · Opt-out disponibile' },
              ],
            },
            {
              title: 'Google Maps (Mappe)',
              blocks: [
                { p: 'Mappa interattiva nella pagina Contatti per mostrare la posizione della palestra.', muted: true },
                { list: ['Cookie per funzionamento mappa', 'Preferenze visualizzazione', 'Statistiche utilizzo'] },
                { p: '[Privacy Policy →](https://policies.google.com/privacy) · Gestibile da browser' },
              ],
            },
            {
              title: 'Vercel Analytics (Statistiche)',
              blocks: [
                { p: "Analisi anonima del traffico web per migliorare l'esperienza utente.", muted: true },
                { list: ['Dati anonimi e aggregati', 'Nessun tracciamento personale', 'Rispetta la privacy by design'] },
                { p: '[Privacy Policy →](https://vercel.com/legal/privacy-policy) · Privacy-friendly' },
              ],
            },
          ],
        },
        {
          box: [
            {
              list: [
                '**Your Online Choices:** [www.youronlinechoices.com](https://www.youronlinechoices.com/)',
                '**Network Advertising Initiative:** [optout.networkadvertising.org](https://optout.networkadvertising.org/)',
                '**Digital Advertising Alliance:** [optout.aboutads.info](https://optout.aboutads.info/)',
              ],
            },
          ],
          title: '🔗 Link Utili per Opt-out',
        },
      ],
    },
    {
      title: '8. Local Storage e Tecnologie Simili',
      blocks: [
        { p: 'Oltre ai cookie, utilizziamo altre tecnologie di archiviazione locale per migliorare la funzionalità del sito:' },
        { h3: '💾 Local Storage' },
        { p: '**Cosa memorizza:**' },
        { list: ['Token di autenticazione per dashboard utenti', 'Preferenze interfaccia utente', 'Impostazioni video player', 'Dati temporanei applicazione'] },
        { p: '**Come eliminare:** Impostazioni browser → Cancella dati di navigazione → Archiviazione locale' },
        { h3: '🔄 Session Storage' },
        { p: "Dati temporanei che vengono eliminati automaticamente alla chiusura del browser. Utilizzato per il funzionamento dell'applicazione React e la navigazione tra le pagine." },
      ],
    },
    {
      title: '9. Trasferimenti Internazionali di Dati',
      blocks: [
        { p: 'Alcuni cookie di terze parti potrebbero comportare trasferimenti di dati verso paesi extra-UE:' },
        {
          box: [
            { p: '**Stati Uniti:**' },
            { list: ['Cal.com - Sistema di prenotazione', 'Google (Maps) - Mappe interattive', 'Vercel - Hosting e analytics'] },
            { p: '**Protezioni:** Data Privacy Framework UE-USA, Clausole Contrattuali Standard UE' },
            { p: '**Diritti:** Puoi sempre revocare il consenso e richiedere la cancellazione dei tuoi dati' },
          ],
          title: '🌍 Paesi Coinvolti',
          tone: 'blue',
        },
      ],
    },
    {
      title: '10. Aggiornamenti della Cookie Policy',
      blocks: [
        { p: 'Questa Cookie Policy viene aggiornata periodicamente per riflettere cambiamenti nei cookie utilizzati o modifiche normative.' },
        { h3: '📬 Come Ti Informiamo' },
        { list: ['Aggiornamento della data in cima al documento', 'Notifica tramite banner sul sito per modifiche sostanziali', 'Email ai utenti registrati (se applicabile)'] },
        { h3: '📅 Controllo Regolare' },
        { p: 'Ti consigliamo di consultare periodicamente questa pagina per rimanere aggiornato sulle nostre pratiche relative ai cookie e alle tue opzioni di controllo.' },
      ],
    },
    {
      title: 'Contatti per Questioni sui Cookie',
      blocks: [
        { p: 'Per domande specifiche sui cookie utilizzati in questo sito o per esercitare i tuoi diritti:' },
        {
          box: [
            { p: `**${OWNER.name}**` },
            { p: OWNER.address },
            { p: `Email: [${OWNER.email}](mailto:${OWNER.email})` },
            { p: `Telefono: ${OWNER.phone}` },
          ],
        },
        {
          p: '**Assistenza Tecnica:** Per problemi tecnici con i cookie o le impostazioni del browser, il nostro team di supporto è disponibile Lunedì-Venerdì, 9:00-17:00.',
          muted: true,
        },
        { p: 'Versione 1.0 - Prima pubblicazione', muted: true },
      ],
    },
  ],
};

export default cookies;
