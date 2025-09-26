import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16">
        <div className="max-w-4xl mx-auto">

          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-600 text-lg">
              Informativa sul trattamento dei dati personali ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)
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

            {/* 1. Titolare del Trattamento */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Titolare del Trattamento</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-2"><strong>Denominazione:</strong> Joshua Maurizio - Personal Trainer</p>
                <p className="mb-2"><strong>Codice Fiscale:</strong> MRZJSH91S17F205F</p>
                <p className="mb-2"><strong>Partita IVA:</strong> 10657880968</p>
                <p className="mb-2"><strong>Indirizzo:</strong> Via Piero Bottoni 10, 20141 Milano (MI)</p>
                <p className="mb-2"><strong>Email:</strong> josh17111991@gmail.com</p>
                <p><strong>Telefono:</strong> +39 328 206 2823</p>
              </div>
              <p className="mt-4 text-gray-600">
                Il Titolare del trattamento è responsabile delle modalità e finalità del trattamento dei dati personali descritte nella presente informativa.
              </p>
            </section>

            {/* 2. Categorie di Dati Trattati */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Categorie di Dati Trattati</h2>
              <p className="mb-4">Trattiamo le seguenti categorie di dati personali:</p>

              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dati Anagrafici e di Contatto</h3>
                  <p className="text-gray-600">Nome, cognome, data di nascita, indirizzo, telefono, email</p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dati relativi alla Salute</h3>
                  <p className="text-gray-600">Informazioni su condizioni fisiche, obiettivi fitness, eventuali patologie rilevanti per l'attività sportiva (con consenso esplicito)</p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dati di Navigazione</h3>
                  <p className="text-gray-600">Indirizzo IP, tipo di browser, sistema operativo, pagine visitate, durata delle visite</p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Dati di Fatturazione e Pagamento</h3>
                  <p className="text-gray-600">Dati necessari per l'emissione di fatture e la gestione dei pagamenti</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-gray-900">Contenuti Video Personalizzati</h3>
                  <p className="text-gray-600">Video di allenamento personalizzati, progressi registrati, performance fisiche</p>
                </div>
              </div>
            </section>

            {/* 3. Finalità del Trattamento */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Finalità del Trattamento e Base Giuridica</h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Finalità</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Base Giuridica</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Erogazione servizi di personal training</td>
                      <td className="border border-gray-300 px-4 py-2">Esecuzione contratto (art. 6, par. 1, lett. b) GDPR</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">Creazione video personalizzati</td>
                      <td className="border border-gray-300 px-4 py-2">Esecuzione contratto e consenso esplicito per dati salute</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Consulenze nutrizionali e fitness</td>
                      <td className="border border-gray-300 px-4 py-2">Esecuzione contratto e consenso esplicito per dati salute</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">Fatturazione e adempimenti fiscali</td>
                      <td className="border border-gray-300 px-4 py-2">Obbligo di legge (art. 6, par. 1, lett. c) GDPR</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Marketing diretto e comunicazioni promozionali</td>
                      <td className="border border-gray-300 px-4 py-2">Consenso esplicito (art. 6, par. 1, lett. a) GDPR</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">Miglioramento servizi e analisi statistiche</td>
                      <td className="border border-gray-300 px-4 py-2">Legittimo interesse (art. 6, par. 1, lett. f) GDPR</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Modalità del Trattamento */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Modalità del Trattamento</h2>
              <p className="mb-4">I dati personali sono trattati con strumenti automatizzati e non automatizzati, con modalità e logiche strettamente correlate alle finalità indicate e, comunque, in modo da garantire la sicurezza e la riservatezza dei dati stessi.</p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Misure di Sicurezza</h3>
                <ul className="list-disc list-inside text-blue-800 space-y-1">
                  <li>Cifratura dei dati sensibili in transito e a riposo</li>
                  <li>Accesso limitato ai dati solo al personale autorizzato</li>
                  <li>Backup regolari con conservazione sicura</li>
                  <li>Aggiornamenti di sicurezza costanti</li>
                  <li>Monitoraggio degli accessi e delle attività</li>
                </ul>
              </div>
            </section>

            {/* 5. Conservazione dei Dati */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Conservazione dei Dati</h2>
              <p className="mb-4">I dati personali sono conservati per il tempo strettamente necessario al raggiungimento delle finalità per cui sono raccolti:</p>

              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Dati contrattuali:</strong> 10 anni dalla cessazione del rapporto (obblighi fiscali)</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Dati sulla salute:</strong> fino alla revoca del consenso o cessazione del rapporto</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Video personalizzati:</strong> fino alla richiesta di cancellazione dell'utente</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Dati di marketing:</strong> fino alla revoca del consenso</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Log di navigazione:</strong> massimo 12 mesi</span>
                </li>
              </ul>
            </section>

            {/* 6. Diritti dell'Interessato */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Diritti dell'Interessato</h2>
              <p className="mb-4">In relazione ai trattamenti descritti, l'interessato ha diritto di:</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">Diritti di Accesso e Informazione</h3>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Accesso ai propri dati personali</li>
                    <li>• Informazioni sul trattamento</li>
                    <li>• Copia dei dati in formato elettronico</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Diritti di Controllo</h3>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Rettifica di dati inesatti</li>
                    <li>• Cancellazione (diritto all'oblio)</li>
                    <li>• Limitazione del trattamento</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">Diritti di Opposizione</h3>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Opposizione al trattamento</li>
                    <li>• Revoca del consenso</li>
                    <li>• Opposizione al marketing diretto</li>
                  </ul>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2">Diritto alla Portabilità</h3>
                  <ul className="text-orange-800 text-sm space-y-1">
                    <li>• Ricevere i dati in formato strutturato</li>
                    <li>• Trasferimento diretto dei dati</li>
                    <li>• Formato leggibile da dispositivo automatico</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="text-yellow-800">
                  <strong>Come esercitare i diritti:</strong> L'interessato può esercitare i propri diritti inviando una richiesta scritta all'indirizzo email o postale del Titolare. La richiesta sarà evasa entro 30 giorni dalla ricezione.
                </p>
              </div>
            </section>

            {/* 7. Trasferimenti Internazionali */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Trasferimenti di Dati verso Paesi Terzi</h2>
              <p className="mb-4">I dati personali possono essere trasferiti verso paesi terzi esclusivamente nei seguenti casi:</p>

              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">EU</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">Paesi UE/SEE</h3>
                    <p className="text-gray-600 text-sm">Trasferimenti all'interno dello Spazio Economico Europeo</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full text-xs flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">✓</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">Paesi con Decisione di Adeguatezza</h3>
                    <p className="text-gray-600 text-sm">Solo verso paesi riconosciuti dalla Commissione Europea come adeguati</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">SCC</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">Clausole Contrattuali Standard</h3>
                    <p className="text-gray-600 text-sm">Con garanzie appropriate mediante Clausole Contrattuali Standard UE</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 8. Comunicazione e Diffusione */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Comunicazione e Diffusione dei Dati</h2>
              <p className="mb-4">I dati personali non sono oggetto di diffusione. Possono essere comunicati esclusivamente a:</p>

              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Collaboratori e dipendenti</strong> debitamente autorizzati e formati</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Fornitori di servizi IT</strong> (hosting, cloud, assistenza tecnica) con accordi DPA</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Commercialista e consulenti</strong> per adempimenti fiscali e legali</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>Autorità competenti</strong> quando richiesto dalla legge</span>
                </li>
              </ul>
            </section>

            {/* 9. Reclami */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Diritto di Reclamo</h2>
              <div className="bg-red-50 p-6 rounded-lg">
                <p className="mb-4">L'interessato ha diritto di proporre reclamo al Garante per la protezione dei dati personali:</p>
                <div className="space-y-2 text-sm">
                  <p><strong>Garante per la Protezione dei Dati Personali</strong></p>
                  <p>Piazza di Monte Citorio, n. 121 - 00186 Roma</p>
                  <p>Centralino: (+39) 06.69677.1</p>
                  <p>Email: garante@gpdp.it</p>
                  <p>PEC: protocollo@pec.gpdp.it</p>
                  <p>Sito web: <a href="https://www.garanteprivacy.it" className="text-blue-600 hover:underline">www.garanteprivacy.it</a></p>
                </div>
              </div>
            </section>

            {/* 10. Aggiornamenti */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Aggiornamenti della Privacy Policy</h2>
              <p className="mb-4">
                La presente informativa può essere aggiornata periodicamente. In caso di modifiche sostanziali,
                l'utente sarà informato mediante:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Notifica via email agli utenti registrati</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Banner informativo sul sito web</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Aggiornamento della data in cima al documento</span>
                </li>
              </ul>
            </section>

            {/* Contatti */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contatti per Questioni sulla Privacy</h2>
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="mb-4">
                  Per qualsiasi domanda relativa alla presente informativa o per l'esercizio dei diritti previsti dal GDPR,
                  è possibile contattare il Titolare del trattamento:
                </p>
                <div className="space-y-2">
                  <p><strong>Joshua Maurizio - Personal Trainer</strong></p>
                  <p>Via Piero Bottoni 10, 20141 Milano (MI)</p>
                  <p>Email: josh17111991@gmail.com</p>
                  <p>Telefono: +39 328 206 2823</p>
                </div>

                <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-500">
                  <p className="text-sm text-gray-600">
                    <strong>Tempo di risposta:</strong> Le richieste verranno evase entro 30 giorni dalla ricezione,
                    come previsto dall'art. 12 del GDPR.
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

export default PrivacyPolicy;