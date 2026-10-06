import type { LegalDoc } from '../types';
import { OWNER } from './owner';

const terms: LegalDoc = {
  title: 'Termini e Condizioni di Servizio',
  subtitle: "Termini e condizioni generali per l'utilizzo dei servizi di personal training",
  updated: '2026-07-20',
  sections: [
    {
      title: '1. Definizioni',
      blocks: [
        { p: 'Ai fini dei presenti Termini e Condizioni, si intende per:' },
        {
          box: [
            { p: `**"Fornitore" o "Personal Trainer":** ${OWNER.people}, P.IVA ${OWNER.vat}, con sede in ${OWNER.address}` },
            { p: '**"Cliente" o "Utente":** la persona fisica che utilizza i servizi offerti' },
            { p: '**"Servizi":** i servizi di personal training, consulenze, video personalizzati e contenuti digitali offerti' },
            { p: '**"Piattaforma":** il sito web e l\'applicazione attraverso cui vengono erogati i servizi' },
            { p: '**"Contratto":** l\'accordo tra il Fornitore e il Cliente per la prestazione dei servizi' },
          ],
        },
      ],
    },
    {
      title: '2. Oggetto e Campo di Applicazione',
      blocks: [
        {
          p: `I presenti Termini e Condizioni disciplinano il rapporto contrattuale tra i Personal Trainer ${OWNER.people} e i Clienti per la fornitura di servizi nel settore del fitness e del benessere.`,
        },
        {
          box: [
            {
              list: [
                'Sessioni di allenamento personalizzate',
                'Consulenze nutrizionali e fitness',
                'Creazione di video di allenamento personalizzati',
                'Programmi di allenamento su misura',
                'Monitoraggio del progresso fisico',
                'Supporto e coaching motivazionale',
              ],
            },
          ],
          title: 'Servizi Offerti',
          tone: 'blue',
        },
        { p: "L'accettazione di questi termini è condizione necessaria per l'accesso e l'utilizzo dei servizi." },
      ],
    },
    {
      title: '3. Accettazione dei Termini',
      blocks: [
        { p: "L'utilizzo dei servizi implica l'accettazione integrale e incondizionata dei presenti Termini e Condizioni." },
        {
          box: [
            {
              p: "Se non si accettano questi termini in tutto o in parte, non è possibile utilizzare i servizi offerti. L'accettazione può avvenire attraverso registrazione, acquisto di servizi o semplice utilizzo della piattaforma.",
            },
          ],
          title: '⚠️ Importante',
          tone: 'amber',
        },
      ],
    },
    {
      title: '4. Condizioni Mediche e Limitazioni di Responsabilità',
      blocks: [
        {
          box: [
            { p: 'Il Cliente dichiara e garantisce:' },
            {
              list: [
                "Di essere in buone condizioni di salute e fisicamente idoneo all'attività fisica",
                "Di non avere patologie che controindichino l'attività sportiva",
                'Di aver consultato un medico prima di iniziare qualsiasi programma di allenamento',
                "Di essere consapevole dei rischi inerenti l'attività fisica",
                'Di assumere piena responsabilità per la propria salute durante gli allenamenti',
              ],
            },
          ],
          title: '🏥 IMPORTANTE - DICHIARAZIONI MEDICHE',
          tone: 'red',
        },
        { h3: 'Limitazioni di Responsabilità del Personal Trainer' },
        {
          list: [
            'Non è un medico e non fornisce consigli medici o diagnosi',
            'Non è responsabile per infortuni derivanti da condizioni mediche preesistenti non dichiarate',
            'Non può sostituire il parere di un medico qualificato',
            "Il Cliente deve interrompere immediatamente l'attività in caso di dolore o malessere",
          ],
        },
        {
          box: [
            {
              p: '**Raccomandazione:** Si consiglia vivamente di sottoporsi a visita medico-sportiva prima di iniziare qualsiasi programma di allenamento, specialmente in presenza di patologie cardiovascolari, muscolari o articolari.',
            },
          ],
          tone: 'blue',
        },
      ],
    },
    {
      title: '5. Modalità di Prenotazione e Pagamento',
      blocks: [
        {
          grid: [
            {
              title: 'Prenotazioni',
              blocks: [
                {
                  list: [
                    'Le prenotazioni avvengono tramite piattaforma online',
                    'Conferma entro 24 ore dalla richiesta',
                    'Possibilità di riprogrammare con preavviso di 24 ore',
                    'Cancellazioni oltre 24 ore: rimborso totale',
                    'Cancellazioni entro 24 ore: no rimborso',
                  ],
                },
              ],
            },
            {
              title: 'Pagamenti',
              blocks: [
                {
                  list: [
                    'Pagamento anticipato per sessioni individuali',
                    'Pacchetti pagabili anche a rate (se concordato)',
                    'Fattura elettronica emessa entro 5 giorni',
                    'Metodi accettati: bonifico, carta, contanti',
                    'Sconti per pacchetti multipli disponibili',
                  ],
                },
              ],
            },
          ],
        },
        { h3: 'Prezzi e Fatturazione' },
        {
          p: 'I prezzi sono quelli indicati al momento della prenotazione e includono IVA quando dovuta. Tutte le prestazioni sono fatturate in conformità alle normative fiscali vigenti.',
        },
      ],
    },
    {
      title: '6. Video Personalizzati e Proprietà Intellettuale',
      blocks: [
        { h3: 'Diritti sui Video Personalizzati' },
        {
          list: [
            'I video sono creati esclusivamente per uso personale del Cliente',
            'È vietata la condivisione, riproduzione o distribuzione a terzi',
            'Il Personal Trainer mantiene tutti i diritti di proprietà intellettuale',
            'Il Cliente ha diritto di utilizzo personale non commerciale',
            'I video possono essere rimossi in caso di violazione dei termini',
          ],
        },
        { h3: 'Contenuti e Metodi di Allenamento' },
        {
          list: [
            'Tutti i programmi e metodi sono di proprietà del Personal Trainer',
            'È vietata la riproduzione commerciale dei contenuti',
            'I contenuti sono protetti da copyright',
            "L'utilizzo deve rispettare i diritti di proprietà intellettuale",
          ],
        },
        {
          box: [
            {
              p: "**Violazioni:** L'uso improprio dei contenuti (condivisione non autorizzata, utilizzo commerciale, etc.) comporta la risoluzione immediata del contratto e possibili azioni legali per violazione del copyright.",
            },
          ],
          tone: 'red',
        },
      ],
    },
    {
      title: '7. Obblighi del Cliente',
      blocks: [
        {
          grid: [
            {
              title: 'Durante gli Allenamenti',
              blocks: [
                {
                  list: [
                    'Seguire le istruzioni del Personal Trainer',
                    'Comunicare tempestivamente dolori o problemi',
                    'Utilizzare abbigliamento e calzature adeguate',
                    'Rispettare gli orari concordati',
                    'Mantenere una condotta rispettosa',
                  ],
                },
              ],
            },
            {
              title: 'Informazioni e Comunicazioni',
              blocks: [
                {
                  list: [
                    'Fornire informazioni mediche accurate',
                    'Comunicare cambiamenti nelle condizioni di salute',
                    'Rispettare la riservatezza dei contenuti',
                    'Utilizzare i video solo personalmente',
                    'Effettuare i pagamenti nei termini concordati',
                  ],
                },
              ],
            },
          ],
        },
        {
          box: [
            { p: 'Il Cliente si impegna a NON:' },
            {
              list: [
                'Condividere contenuti riservati con terzi',
                'Utilizzare i servizi per scopi commerciali senza autorizzazione',
                'Tenere comportamenti irrispettosi o inappropriati',
                'Danneggiare attrezzature o strutture',
              ],
            },
          ],
          title: 'Comportamenti Vietati',
          tone: 'amber',
        },
      ],
    },
    {
      title: '8. Diritto di Recesso (Codice del Consumo)',
      blocks: [
        {
          box: [
            {
              p: 'In conformità al D.Lgs. 206/2005 (Codice del Consumo), il Cliente-consumatore ha diritto di recesso entro 14 giorni dalla sottoscrizione del contratto.',
            },
            { h4: 'Modalità di Recesso' },
            { list: ['Comunicazione scritta entro 14 giorni', 'Utilizzo del modulo di recesso (se fornito) o dichiarazione esplicita', 'Invio via email o raccomandata'] },
            { h4: 'Rimborsi' },
            {
              list: [
                'Rimborso entro 14 giorni dalla comunicazione di recesso',
                'Restituzione tramite stesso metodo di pagamento utilizzato',
                'Eventuale trattenuta per servizi già erogati (se espressamente richiesti)',
              ],
            },
          ],
          title: 'Diritti del Consumatore',
          tone: 'blue',
        },
        { h3: 'Eccezioni al Diritto di Recesso' },
        {
          p: 'Il diritto di recesso è escluso per contenuti digitali personalizzati (video su misura) dopo che la prestazione è iniziata con consenso espresso del consumatore e rinuncia al diritto di recesso.',
        },
      ],
    },
    {
      title: '9. Risoluzione e Sospensione del Contratto',
      blocks: [
        { h3: 'Cause di Risoluzione Immediata' },
        {
          list: [
            'Violazione grave dei presenti termini',
            'Comportamenti inappropriati o irrispettosi',
            'Mancato pagamento oltre 30 giorni dalla scadenza',
            'Condivisione non autorizzata di contenuti riservati',
            "Condizioni di salute che controindichino l'attività fisica",
          ],
        },
        { h3: 'Risoluzione Consensuale' },
        { p: 'Il contratto può essere risolto consensualmente in qualsiasi momento, con:' },
        { list: ['Preavviso di almeno 15 giorni', 'Definizione delle prestazioni già erogate', 'Eventuale rimborso per servizi non fruiti'] },
      ],
    },
    {
      title: '10. Responsabilità e Copertura Assicurativa',
      blocks: [
        { h3: 'Copertura Assicurativa del Personal Trainer' },
        {
          list: [
            'Polizza di responsabilità civile professionale attiva',
            "Copertura per danni causati nello svolgimento dell'attività professionale",
            'Massimali conformi agli standard di categoria',
          ],
        },
        { h3: 'Limitazioni di Responsabilità' },
        {
          list: [
            'La responsabilità è limitata ai danni direttamente imputabili a colpa grave',
            'Esclusione per danni derivanti da condizioni mediche non dichiarate',
            'Esclusione per attività svolte autonomamente dal Cliente',
            'Esclusione per inosservanza delle istruzioni ricevute',
          ],
        },
        {
          box: [
            {
              p: '**Raccomandazione:** Si consiglia al Cliente di verificare la propria copertura assicurativa per attività sportive e infortuni. Il Personal Trainer può fornire informazioni su polizze specifiche disponibili.',
            },
          ],
          tone: 'blue',
        },
      ],
    },
    {
      title: '11. Modifiche ai Termini e Condizioni',
      blocks: [
        { p: 'Il Personal Trainer si riserva il diritto di modificare i presenti Termini e Condizioni in qualsiasi momento.' },
        { h3: 'Modalità di Notifica' },
        { list: ['Email a tutti i clienti registrati', 'Pubblicazione sul sito web con evidenza delle modifiche', 'Notifica durante le sessioni di allenamento'] },
        { h3: 'Efficacia delle Modifiche' },
        { p: "Le modifiche entreranno in vigore 15 giorni dopo la notifica. L'utilizzo continuato dei servizi costituisce accettazione delle nuove condizioni." },
      ],
    },
    {
      title: '12. Legge Applicabile e Foro Competente',
      blocks: [
        { h3: 'Legge Applicabile' },
        { p: 'Il presente contratto è regolato dalla legge italiana. Ogni questione relativa alla validità, interpretazione ed esecuzione è disciplinata dal diritto italiano.' },
        { h3: 'Foro Competente' },
        { p: 'Per i consumatori: competenza del foro di residenza del consumatore o del foro di Milano, a scelta del consumatore.' },
        { p: 'Per soggetti diversi dai consumatori: foro esclusivo di Milano.' },
        { h3: 'Risoluzione Alternative delle Controversie (ADR/ODR)' },
        {
          p: 'Prima di ricorrere al foro competente, le parti si impegnano a tentare una risoluzione amichevole della controversia attraverso mediazione o arbitrato, se concordato.',
        },
        {
          box: [
            { p: 'Ai sensi del Regolamento UE n. 524/2013, informiamo che è disponibile una piattaforma europea per la risoluzione online delle controversie (ODR) tra consumatori e professionisti.' },
            { p: '**Link alla piattaforma:** [https://ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr)' },
            { p: 'Tramite questa piattaforma, il consumatore può presentare un reclamo e avviare una procedura di risoluzione extragiudiziale delle controversie online.' },
            { p: `**Email per ODR:** ${OWNER.email}` },
          ],
          title: '🇪🇺 Piattaforma ODR (Online Dispute Resolution)',
          tone: 'blue',
        },
      ],
    },
    {
      title: '13. Disposizioni Finali',
      blocks: [
        { h3: 'Validità Parziale' },
        { p: "L'eventuale nullità o inefficacia di singole clausole non comporta la nullità dell'intero contratto, che rimane valido ed efficace per le parti restanti." },
        { h3: 'Intero Accordo' },
        {
          p: "I presenti Termini e Condizioni, insieme alla Privacy Policy, costituiscono l'intero accordo tra le parti e sostituiscono qualsiasi precedente accordo verbale o scritto.",
        },
        { h3: 'Forma Scritta' },
        { p: 'Eventuali modifiche o integrazioni dovranno essere concordate per iscritto e sottoscritte da entrambe le parti per essere efficaci.' },
      ],
    },
    {
      title: 'Contatti',
      blocks: [
        { p: 'Per qualsiasi domanda relativa ai presenti Termini e Condizioni:' },
        {
          box: [
            { p: `**${OWNER.name}**` },
            { p: `Codice Fiscale: ${OWNER.taxCode}` },
            { p: `Partita IVA: ${OWNER.vat}` },
            { p: OWNER.address },
            { p: `Email: [${OWNER.email}](mailto:${OWNER.email})` },
            { p: `Telefono: ${OWNER.phone}` },
            { p: '**Orari di contatto:** Lunedì - Venerdì: 9:00 - 19:00. Risposta garantita entro 48 ore lavorative' },
          ],
        },
      ],
    },
  ],
};

export default terms;
