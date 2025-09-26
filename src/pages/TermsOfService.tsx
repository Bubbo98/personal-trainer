import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16">
        <div className="max-w-4xl mx-auto">

          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Termini e Condizioni di Servizio
            </h1>
            <p className="text-gray-600 text-lg">
              Termini e condizioni generali per l'utilizzo dei servizi di personal training
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">

            {/* 1. Definizioni */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Definizioni</h2>
              <p className="mb-4">Ai fini dei presenti Termini e Condizioni, si intende per:</p>

              <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                <div>
                  <p><strong>"Fornitore" o "Personal Trainer":</strong> Joshua Maurizio, P.IVA 10657880968, con sede in Via Piero Bottoni 10, 20141 Milano (MI)</p>
                </div>
                <div>
                  <p><strong>"Cliente" o "Utente":</strong> la persona fisica che utilizza i servizi offerti</p>
                </div>
                <div>
                  <p><strong>"Servizi":</strong> i servizi di personal training, consulenze, video personalizzati e contenuti digitali offerti</p>
                </div>
                <div>
                  <p><strong>"Piattaforma":</strong> il sito web e l'applicazione attraverso cui vengono erogati i servizi</p>
                </div>
                <div>
                  <p><strong>"Contratto":</strong> l'accordo tra il Fornitore e il Cliente per la prestazione dei servizi</p>
                </div>
              </div>
            </section>

            {/* 2. Oggetto e Campo di Applicazione */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Oggetto e Campo di Applicazione</h2>
              <p className="mb-4">
                I presenti Termini e Condizioni disciplinano il rapporto contrattuale tra il Personal Trainer Joshua Maurizio
                e i Clienti per la fornitura di servizi nel settore del fitness e del benessere.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Servizi Offerti</h3>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• Sessioni di allenamento personalizzate</li>
                  <li>• Consulenze nutrizionali e fitness</li>
                  <li>• Creazione di video di allenamento personalizzati</li>
                  <li>• Programmi di allenamento su misura</li>
                  <li>• Monitoraggio del progresso fisico</li>
                  <li>• Supporto e coaching motivazionale</li>
                </ul>
              </div>

              <p className="mt-4 text-gray-600">
                L'accettazione di questi termini è condizione necessaria per l'accesso e l'utilizzo dei servizi.
              </p>
            </section>

            {/* 3. Accettazione dei Termini */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Accettazione dei Termini</h2>
              <p className="mb-4">
                L'utilizzo dei servizi implica l'accettazione integrale e incondizionata dei presenti Termini e Condizioni.
              </p>

              <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Importante</h3>
                <p className="text-yellow-800 text-sm">
                  Se non si accettano questi termini in tutto o in parte, non è possibile utilizzare i servizi offerti.
                  L'accettazione può avvenire attraverso registrazione, acquisto di servizi o semplice utilizzo della piattaforma.
                </p>
              </div>
            </section>

            {/* 4. Condizioni Mediche e Limitazioni */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Condizioni Mediche e Limitazioni di Responsabilità</h2>

              <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-4">
                <h3 className="font-bold text-red-900 mb-3">🏥 IMPORTANTE - DICHIARAZIONI MEDICHE</h3>
                <div className="space-y-2 text-red-800">
                  <p className="font-semibold">Il Cliente dichiara e garantisce:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Di essere in buone condizioni di salute e fisicamente idoneo all'attività fisica</li>
                    <li>Di non avere patologie che controindichino l'attività sportiva</li>
                    <li>Di aver consultato un medico prima di iniziare qualsiasi programma di allenamento</li>
                    <li>Di essere consapevole dei rischi inerenti l'attività fisica</li>
                    <li>Di assumere piena responsabilità per la propria salute durante gli allenamenti</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Limitazioni di Responsabilità del Personal Trainer</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Non è un medico e non fornisce consigli medici o diagnosi</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Non è responsabile per infortuni derivanti da condizioni mediche preesistenti non dichiarate</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Non può sostituire il parere di un medico qualificato</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Il Cliente deve interrompere immediatamente l'attività in caso di dolore o malessere</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-orange-50 border-l-4 border-orange-400">
                <p className="text-orange-800 text-sm">
                  <strong>Raccomandazione:</strong> Si consiglia vivamente di sottoporsi a visita medico-sportiva
                  prima di iniziare qualsiasi programma di allenamento, specialmente in presenza di patologie cardiovascolari,
                  muscolari o articolari.
                </p>
              </div>
            </section>

            {/* 5. Modalità di Prenotazione e Pagamento */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Modalità di Prenotazione e Pagamento</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Prenotazioni</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Le prenotazioni avvengono tramite piattaforma online</li>
                    <li>• Conferma entro 24 ore dalla richiesta</li>
                    <li>• Possibilità di riprogrammare con preavviso di 24 ore</li>
                    <li>• Cancellazioni oltre 24 ore: rimborso totale</li>
                    <li>• Cancellazioni entro 24 ore: no rimborso</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Pagamenti</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Pagamento anticipato per sessioni individuali</li>
                    <li>• Pacchetti pagabili anche a rate (se concordato)</li>
                    <li>• Fattura elettronica emessa entro 5 giorni</li>
                    <li>• Metodi accettati: bonifico, carta, contanti</li>
                    <li>• Sconti per pacchetti multipli disponibili</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Prezzi e Fatturazione</h3>
                <p className="text-green-800 text-sm">
                  I prezzi sono quelli indicati al momento della prenotazione e includono IVA quando dovuta.
                  Tutte le prestazioni sono fatturate in conformità alle normative fiscali vigenti.
                </p>
              </div>
            </section>

            {/* 6. Video Personalizzati e Proprietà Intellettuale */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Video Personalizzati e Proprietà Intellettuale</h2>

              <div className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">Diritti sui Video Personalizzati</h3>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• I video sono creati esclusivamente per uso personale del Cliente</li>
                    <li>• È vietata la condivisione, riproduzione o distribuzione a terzi</li>
                    <li>• Il Personal Trainer mantiene tutti i diritti di proprietà intellettuale</li>
                    <li>• Il Cliente ha diritto di utilizzo personale non commerciale</li>
                    <li>• I video possono essere rimossi in caso di violazione dei termini</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Contenuti e Metodi di Allenamento</h3>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Tutti i programmi e metodi sono di proprietà del Personal Trainer</li>
                    <li>• È vietata la riproduzione commerciale dei contenuti</li>
                    <li>• I contenuti sono protetti da copyright</li>
                    <li>• L'utilizzo deve rispettare i diritti di proprietà intellettuale</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 border-l-4 border-red-500 bg-red-50 p-4">
                <p className="text-red-800 text-sm">
                  <strong>Violazioni:</strong> L'uso improprio dei contenuti (condivisione non autorizzata, utilizzo commerciale, etc.)
                  comporta la risoluzione immediata del contratto e possibili azioni legali per violazione del copyright.
                </p>
              </div>
            </section>

            {/* 7. Obblighi del Cliente */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Obblighi del Cliente</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Durante gli Allenamenti</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Seguire le istruzioni del Personal Trainer</li>
                    <li>• Comunicare tempestivamente dolori o problemi</li>
                    <li>• Utilizzare abbigliamento e calzature adeguate</li>
                    <li>• Rispettare gli orari concordati</li>
                    <li>• Mantenere una condotta rispettosa</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Informazioni e Comunicazioni</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Fornire informazioni mediche accurate</li>
                    <li>• Comunicare cambiamenti nelle condizioni di salute</li>
                    <li>• Rispettare la riservatezza dei contenuti</li>
                    <li>• Utilizzare i video solo personalmente</li>
                    <li>• Effettuare i pagamenti nei termini concordati</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <h3 className="font-semibold text-yellow-900 mb-2">Comportamenti Vietati</h3>
                <p className="text-yellow-800 text-sm mb-2">Il Cliente si impegna a NON:</p>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• Condividere contenuti riservati con terzi</li>
                  <li>• Utilizzare i servizi per scopi commerciali senza autorizzazione</li>
                  <li>• Tenere comportamenti irrispettosi o inappropriati</li>
                  <li>• Danneggiare attrezzature o strutture</li>
                </ul>
              </div>
            </section>

            {/* 8. Diritto di Recesso */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Diritto di Recesso (Codice del Consumo)</h2>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Diritti del Consumatore</h3>
                <p className="text-green-800 text-sm mb-3">
                  In conformità al D.Lgs. 206/2005 (Codice del Consumo), il Cliente-consumatore ha diritto di recesso
                  entro 14 giorni dalla sottoscrizione del contratto.
                </p>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-green-900">Modalità di Recesso</h4>
                    <ul className="text-green-800 text-sm space-y-1">
                      <li>• Comunicazione scritta entro 14 giorni</li>
                      <li>• Utilizzo del modulo di recesso (se fornito) o dichiarazione esplicita</li>
                      <li>• Invio via email o raccomandata</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-green-900">Rimborsi</h4>
                    <ul className="text-green-800 text-sm space-y-1">
                      <li>• Rimborso entro 14 giorni dalla comunicazione di recesso</li>
                      <li>• Restituzione tramite stesso metodo di pagamento utilizzato</li>
                      <li>• Eventuale trattenuta per servizi già erogati (se espressamente richiesti)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
                <h3 className="font-semibold text-orange-900 mb-2">Eccezioni al Diritto di Recesso</h3>
                <p className="text-orange-800 text-sm">
                  Il diritto di recesso è escluso per contenuti digitali personalizzati (video su misura)
                  dopo che la prestazione è iniziata con consenso espresso del consumatore e rinuncia al diritto di recesso.
                </p>
              </div>
            </section>

            {/* 9. Risoluzione e Sospensione */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Risoluzione e Sospensione del Contratto</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Cause di Risoluzione Immediata</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Violazione grave dei presenti termini</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Comportamenti inappropriati o irrispettosi</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Mancato pagamento oltre 30 giorni dalla scadenza</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Condivisione non autorizzata di contenuti riservati</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>Condizioni di salute che controindichino l'attività fisica</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Risoluzione Consensuale</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    Il contratto può essere risolto consensualmente in qualsiasi momento, con:
                  </p>
                  <ul className="space-y-1 text-gray-700 text-sm">
                    <li>• Preavviso di almeno 15 giorni</li>
                    <li>• Definizione delle prestazioni già erogate</li>
                    <li>• Eventuale rimborso per servizi non fruiti</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 10. Responsabilità e Assicurazione */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Responsabilità e Copertura Assicurativa</h2>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Copertura Assicurativa del Personal Trainer</h3>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Polizza di responsabilità civile professionale attiva</li>
                    <li>• Copertura per danni causati nello svolgimento dell'attività professionale</li>
                    <li>• Massimali conformi agli standard di categoria</li>
                  </ul>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-2">Limitazioni di Responsabilità</h3>
                  <ul className="text-red-800 text-sm space-y-1">
                    <li>• La responsabilità è limitata ai danni direttamente imputabili a colpa grave</li>
                    <li>• Esclusione per danni derivanti da condizioni mediche non dichiarate</li>
                    <li>• Esclusione per attività svolte autonomamente dal Cliente</li>
                    <li>• Esclusione per inosservanza delle istruzioni ricevute</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="text-yellow-800 text-sm">
                  <strong>Raccomandazione:</strong> Si consiglia al Cliente di verificare la propria copertura assicurativa
                  per attività sportive e infortuni. Il Personal Trainer può fornire informazioni su polizze specifiche disponibili.
                </p>
              </div>
            </section>

            {/* 11. Modifiche ai Termini */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Modifiche ai Termini e Condizioni</h2>
              <p className="mb-4">
                Il Personal Trainer si riserva il diritto di modificare i presenti Termini e Condizioni in qualsiasi momento.
              </p>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Modalità di Notifica</h3>
                  <ul className="space-y-1 text-gray-700 text-sm">
                    <li>• Email a tutti i clienti registrati</li>
                    <li>• Pubblicazione sul sito web con evidenza delle modifiche</li>
                    <li>• Notifica durante le sessioni di allenamento</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Efficacia delle Modifiche</h3>
                  <p className="text-gray-700 text-sm">
                    Le modifiche entreranno in vigore 15 giorni dopo la notifica.
                    L'utilizzo continuato dei servizi costituisce accettazione delle nuove condizioni.
                  </p>
                </div>
              </div>
            </section>

            {/* 12. Legge Applicabile e Foro Competente */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Legge Applicabile e Foro Competente</h2>

              <div className="bg-gray-100 p-6 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Legge Applicabile</h3>
                    <p className="text-gray-700 text-sm">
                      Il presente contratto è regolato dalla legge italiana.
                      Ogni questione relativa alla validità, interpretazione ed esecuzione è disciplinata dal diritto italiano.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Foro Competente</h3>
                    <p className="text-gray-700 text-sm mb-2">
                      Per i consumatori: competenza del foro di residenza del consumatore o del foro di Milano, a scelta del consumatore.
                    </p>
                    <p className="text-gray-700 text-sm">
                      Per soggetti diversi dai consumatori: foro esclusivo di Milano.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Risoluzione Alternative delle Controversie</h3>
                    <p className="text-gray-700 text-sm">
                      Prima di ricorrere al foro competente, le parti si impegnano a tentare una risoluzione
                      amichevole della controversia attraverso mediazione o arbitrato, se concordato.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 13. Disposizioni Finali */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Disposizioni Finali</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Validità Parziale</h3>
                  <p className="text-gray-700 text-sm">
                    L'eventuale nullità o inefficacia di singole clausole non comporta la nullità dell'intero contratto,
                    che rimane valido ed efficace per le parti restanti.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Intero Accordo</h3>
                  <p className="text-gray-700 text-sm">
                    I presenti Termini e Condizioni, insieme alla Privacy Policy, costituiscono l'intero accordo
                    tra le parti e sostituiscono qualsiasi precedente accordo verbale o scritto.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Forma Scritta</h3>
                  <p className="text-gray-700 text-sm">
                    Eventuali modifiche o integrazioni dovranno essere concordate per iscritto
                    e sottoscritte da entrambe le parti per essere efficaci.
                  </p>
                </div>
              </div>
            </section>

            {/* Contatti */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contatti</h2>
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="mb-4">
                  Per qualsiasi domanda relativa ai presenti Termini e Condizioni:
                </p>
                <div className="space-y-2">
                  <p><strong>Joshua Maurizio - Personal Trainer</strong></p>
                  <p>Codice Fiscale: MRZJSH91S17F205F</p>
                  <p>Partita IVA: 10657880968</p>
                  <p>Via Piero Bottoni 10, 20141 Milano (MI)</p>
                  <p>Email: josh17111991@gmail.com</p>
                  <p>Telefono: +39 328 206 2823</p>
                </div>

                <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-500">
                  <p className="text-sm text-gray-600">
                    <strong>Orari di contatto:</strong><br/>
                    Lunedì - Venerdì: 9:00 - 19:00<br/>
                    Risposta garantita entro 48 ore lavorative
                  </p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;