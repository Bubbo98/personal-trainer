import type { LegalDoc } from '../types';
import { OWNER } from './owner';

const privacy: LegalDoc = {
  title: 'Privacy Policy',
  subtitle: "Informativa sul trattamento dei dati personali ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)",
  updated: '2026-07-20',
  sections: [
    {
      title: '1. Titolare del Trattamento',
      blocks: [
        {
          box: [
            { p: `**Denominazione:** ${OWNER.name}` },
            { p: `**Codice Fiscale:** ${OWNER.taxCode}` },
            { p: `**Partita IVA:** ${OWNER.vat}` },
            { p: `**Indirizzo:** ${OWNER.address}` },
            { p: `**Email:** ${OWNER.email}` },
            { p: `**Telefono:** ${OWNER.phone}` },
          ],
        },
        { p: 'Il Titolare del trattamento è responsabile delle modalità e finalità del trattamento dei dati personali descritte nella presente informativa.', muted: true },
      ],
    },
    {
      title: '2. Categorie di Dati Trattati',
      blocks: [
        { p: 'Trattiamo le seguenti categorie di dati personali:' },
        {
          grid: [
            { title: 'Dati Anagrafici e di Contatto', tone: 'blue', blocks: [{ p: 'Nome, cognome, data di nascita, indirizzo, telefono, email', muted: true }] },
            {
              title: 'Dati relativi alla Salute',
              tone: 'green',
              blocks: [{ p: "Informazioni su condizioni fisiche, obiettivi fitness, eventuali patologie rilevanti per l'attività sportiva (con consenso esplicito)", muted: true }],
            },
            { title: 'Dati di Navigazione', tone: 'purple', blocks: [{ p: 'Indirizzo IP, tipo di browser, sistema operativo, pagine visitate, durata delle visite', muted: true }] },
            { title: 'Dati di Fatturazione e Pagamento', tone: 'amber', blocks: [{ p: "Dati necessari per l'emissione di fatture e la gestione dei pagamenti", muted: true }] },
            { title: 'Contenuti Video Personalizzati', tone: 'red', blocks: [{ p: 'Video di allenamento personalizzati, progressi registrati, performance fisiche', muted: true }] },
          ],
        },
      ],
    },
    {
      title: '3. Finalità del Trattamento e Base Giuridica',
      blocks: [
        {
          table: {
            head: ['Finalità', 'Base Giuridica'],
            rows: [
              ['Erogazione servizi di personal training', 'Esecuzione contratto (art. 6, par. 1, lett. b) GDPR'],
              ['Creazione video personalizzati', 'Esecuzione contratto e consenso esplicito per dati salute'],
              ['Consulenze nutrizionali e fitness', 'Esecuzione contratto e consenso esplicito per dati salute'],
              ['Fatturazione e adempimenti fiscali', 'Obbligo di legge (art. 6, par. 1, lett. c) GDPR'],
              ['Marketing diretto e comunicazioni promozionali', 'Consenso esplicito (art. 6, par. 1, lett. a) GDPR'],
              ['Miglioramento servizi e analisi statistiche', 'Legittimo interesse (art. 6, par. 1, lett. f) GDPR'],
            ],
          },
        },
      ],
    },
    {
      title: '4. Modalità del Trattamento',
      blocks: [
        {
          p: 'I dati personali sono trattati con strumenti automatizzati e non automatizzati, con modalità e logiche strettamente correlate alle finalità indicate e, comunque, in modo da garantire la sicurezza e la riservatezza dei dati stessi.',
        },
        {
          box: [
            {
              list: [
                'Cifratura dei dati sensibili in transito e a riposo',
                'Accesso limitato ai dati solo al personale autorizzato',
                'Backup regolari con conservazione sicura',
                'Aggiornamenti di sicurezza costanti',
                'Monitoraggio degli accessi e delle attività',
              ],
            },
          ],
          title: 'Misure di Sicurezza',
          tone: 'blue',
        },
      ],
    },
    {
      title: '5. Conservazione dei Dati',
      blocks: [
        { p: 'I dati personali sono conservati per il tempo strettamente necessario al raggiungimento delle finalità per cui sono raccolti:' },
        {
          list: [
            '**Dati contrattuali:** 10 anni dalla cessazione del rapporto (obblighi fiscali)',
            '**Dati sulla salute:** fino alla revoca del consenso o cessazione del rapporto',
            "**Video personalizzati:** fino alla richiesta di cancellazione dell'utente",
            '**Dati di marketing:** fino alla revoca del consenso',
            '**Log di navigazione:** massimo 12 mesi',
          ],
        },
      ],
    },
    {
      title: "6. Diritti dell'Interessato",
      blocks: [
        { p: "In relazione ai trattamenti descritti, l'interessato ha diritto di:" },
        {
          grid: [
            { title: 'Diritti di Accesso e Informazione', blocks: [{ list: ['Accesso ai propri dati personali', 'Informazioni sul trattamento', 'Copia dei dati in formato elettronico'] }] },
            { title: 'Diritti di Controllo', blocks: [{ list: ['Rettifica di dati inesatti', "Cancellazione (diritto all'oblio)", 'Limitazione del trattamento'] }] },
            { title: 'Diritti di Opposizione', blocks: [{ list: ['Opposizione al trattamento', 'Revoca del consenso', 'Opposizione al marketing diretto'] }] },
            {
              title: 'Diritto alla Portabilità',
              blocks: [{ list: ['Ricevere i dati in formato strutturato', 'Trasferimento diretto dei dati', 'Formato leggibile da dispositivo automatico'] }],
            },
          ],
        },
        {
          box: [
            {
              p: "**Come esercitare i diritti:** L'interessato può esercitare i propri diritti inviando una richiesta scritta all'indirizzo email o postale del Titolare. La richiesta sarà evasa entro 30 giorni dalla ricezione.",
            },
          ],
          tone: 'blue',
        },
      ],
    },
    {
      title: '7. Profilazione e Decisioni Automatizzate',
      blocks: [
        { p: "Ai sensi dell'art. 22 del GDPR, informiamo che:" },
        {
          box: [
            {
              p: 'I tuoi dati personali **NON** sono soggetti a processi decisionali automatizzati né a profilazione che producano effetti giuridici o incidano significativamente sulla tua persona.',
            },
            {
              list: [
                'Non utilizziamo algoritmi per decisioni automatiche sui servizi offerti',
                'I programmi di allenamento sono creati personalmente dal Personal Trainer',
                'Le valutazioni sui progressi sono effettuate manualmente',
                'Non vendiamo o condividiamo dati per finalità di marketing automatizzato',
              ],
            },
          ],
          title: 'Nessuna Profilazione Automatizzata',
          tone: 'green',
        },
        {
          box: [
            {
              p: "Utilizziamo strumenti di analisi (Vercel Analytics) per raccogliere dati anonimi e aggregati sul traffico del sito web. Questi dati non permettono l'identificazione personale e sono utilizzati esclusivamente per migliorare l'esperienza utente del sito.",
            },
          ],
          title: 'Analisi Statistiche Aggregate',
          tone: 'blue',
        },
      ],
    },
    {
      title: '8. Trasferimenti di Dati verso Paesi Terzi',
      blocks: [
        { p: 'I dati personali possono essere trasferiti verso paesi terzi esclusivamente nei seguenti casi:' },
        {
          list: [
            "**Paesi UE/SEE:** trasferimenti all'interno dello Spazio Economico Europeo",
            '**Paesi con Decisione di Adeguatezza:** solo verso paesi riconosciuti dalla Commissione Europea come adeguati',
            '**Clausole Contrattuali Standard:** con garanzie appropriate mediante Clausole Contrattuali Standard UE',
          ],
        },
      ],
    },
    {
      title: '9. Comunicazione e Diffusione dei Dati',
      blocks: [
        { p: 'I dati personali non sono oggetto di diffusione. Possono essere comunicati esclusivamente a:' },
        {
          list: [
            '**Collaboratori e dipendenti** debitamente autorizzati e formati',
            '**Fornitori di servizi IT** (hosting, cloud, assistenza tecnica) con accordi DPA',
            '**Commercialista e consulenti** per adempimenti fiscali e legali',
            '**Autorità competenti** quando richiesto dalla legge',
          ],
        },
      ],
    },
    {
      title: '10. Diritto di Reclamo',
      blocks: [
        { p: "L'interessato ha diritto di proporre reclamo al Garante per la protezione dei dati personali:" },
        {
          box: [
            { p: '**Garante per la Protezione dei Dati Personali**' },
            { p: 'Piazza di Monte Citorio, n. 121 - 00186 Roma' },
            { p: 'Centralino: (+39) 06.69677.1' },
            { p: 'Email: [garante@gpdp.it](mailto:garante@gpdp.it)' },
            { p: 'PEC: protocollo@pec.gpdp.it' },
            { p: 'Sito web: [www.garanteprivacy.it](https://www.garanteprivacy.it)' },
          ],
          tone: 'amber',
        },
      ],
    },
    {
      title: '11. Aggiornamenti della Privacy Policy',
      blocks: [
        { p: "La presente informativa può essere aggiornata periodicamente. In caso di modifiche sostanziali, l'utente sarà informato mediante:" },
        { list: ['Notifica via email agli utenti registrati', 'Banner informativo sul sito web', 'Aggiornamento della data in cima al documento'] },
      ],
    },
    {
      title: 'Contatti per Questioni sulla Privacy',
      blocks: [
        {
          p: "Per qualsiasi domanda relativa alla presente informativa o per l'esercizio dei diritti previsti dal GDPR, è possibile contattare il Titolare del trattamento:",
        },
        {
          box: [
            { p: `**${OWNER.name}**` },
            { p: OWNER.address },
            { p: `Email: [${OWNER.email}](mailto:${OWNER.email})` },
            { p: `Telefono: ${OWNER.phone}` },
          ],
        },
        { p: "**Tempo di risposta:** Le richieste verranno evase entro 30 giorni dalla ricezione, come previsto dall'art. 12 del GDPR.", muted: true },
      ],
    },
  ],
};

export default privacy;
