import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CookiePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16">
        <div className="max-w-4xl mx-auto">

          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Cookie Policy
            </h1>
            <p className="text-gray-600 text-lg">
              Informazioni sull'uso dei cookie e tecnologie simili su questo sito web
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

            {/* 1. Cosa sono i Cookie */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Cosa sono i Cookie</h2>
              <p className="mb-4">
                I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo dell'utente quando visita un sito web.
                Permettono al sito di riconoscere il dispositivo dell'utente e memorizzare alcune informazioni sulle sue preferenze o azioni.
              </p>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">🍪 Come Funzionano i Cookie</h3>
                <div className="space-y-2 text-blue-800 text-sm">
                  <p>• <strong>Memorizzazione:</strong> Quando visiti il sito, i cookie vengono salvati sul tuo browser</p>
                  <p>• <strong>Lettura:</strong> Nelle visite successive, il sito può leggere i cookie salvati</p>
                  <p>• <strong>Scadenza:</strong> Ogni cookie ha una data di scadenza dopo la quale viene automaticamente eliminato</p>
                  <p>• <strong>Controllo:</strong> Puoi sempre visualizzare, modificare o eliminare i cookie dalle impostazioni del browser</p>
                </div>
              </div>
            </section>

            {/* 2. Titolare del Trattamento */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Titolare del Trattamento</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-2"><strong>Denominazione:</strong> Joshua Maurizio - Personal Trainer</p>
                <p className="mb-2"><strong>Codice Fiscale:</strong> MRZJSH91S17F205F</p>
                <p className="mb-2"><strong>Partita IVA:</strong> 10657880968</p>
                <p className="mb-2"><strong>Indirizzo:</strong> Via Piero Bottoni 10, 20141 Milano (MI)</p>
                <p className="mb-2"><strong>Email:</strong> [email disponibile su richiesta]</p>
                <p><strong>Sito web:</strong> {window.location.origin}</p>
              </div>
            </section>

            {/* 3. Tipi di Cookie Utilizzati */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Tipi di Cookie Utilizzati</h2>
              <p className="mb-6">Il nostro sito web utilizza diversi tipi di cookie per diverse finalità:</p>

              <div className="space-y-6">

                {/* Cookie Tecnici */}
                <div className="border border-green-200 bg-green-50 p-6 rounded-lg">
                  <h3 className="font-bold text-green-900 mb-3">🔧 Cookie Tecnici (Necessari)</h3>
                  <p className="text-green-800 text-sm mb-4">
                    Questi cookie sono essenziali per il funzionamento del sito web e non possono essere disabilitati.
                    Non richiedono consenso secondo la normativa vigente.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-green-300 text-sm">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="border border-green-300 px-3 py-2 text-left">Cookie</th>
                          <th className="border border-green-300 px-3 py-2 text-left">Finalità</th>
                          <th className="border border-green-300 px-3 py-2 text-left">Durata</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-green-300 px-3 py-2">admin_auth_token</td>
                          <td className="border border-green-300 px-3 py-2">Autenticazione amministratore</td>
                          <td className="border border-green-300 px-3 py-2">Sessione</td>
                        </tr>
                        <tr className="bg-green-25">
                          <td className="border border-green-300 px-3 py-2">dashboard_auth_token</td>
                          <td className="border border-green-300 px-3 py-2">Autenticazione utente dashboard</td>
                          <td className="border border-green-300 px-3 py-2">30 giorni</td>
                        </tr>
                        <tr>
                          <td className="border border-green-300 px-3 py-2">react_app_session</td>
                          <td className="border border-green-300 px-3 py-2">Funzionamento applicazione React</td>
                          <td className="border border-green-300 px-3 py-2">Sessione</td>
                        </tr>
                        <tr className="bg-green-25">
                          <td className="border border-green-300 px-3 py-2">i18nextLng</td>
                          <td className="border border-green-300 px-3 py-2">Preferenza lingua selezionata</td>
                          <td className="border border-green-300 px-3 py-2">1 anno</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cookie di Funzionalità */}
                <div className="border border-blue-200 bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-bold text-blue-900 mb-3">⚙️ Cookie di Funzionalità</h3>
                  <p className="text-blue-800 text-sm mb-4">
                    Questi cookie migliorano la funzionalità del sito e l'esperienza utente, memorizzando le preferenze.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-blue-300 text-sm">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="border border-blue-300 px-3 py-2 text-left">Cookie</th>
                          <th className="border border-blue-300 px-3 py-2 text-left">Finalità</th>
                          <th className="border border-blue-300 px-3 py-2 text-left">Durata</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-blue-300 px-3 py-2">video_player_settings</td>
                          <td className="border border-blue-300 px-3 py-2">Preferenze lettore video (volume, qualità)</td>
                          <td className="border border-blue-300 px-3 py-2">30 giorni</td>
                        </tr>
                        <tr className="bg-blue-25">
                          <td className="border border-blue-300 px-3 py-2">user_preferences</td>
                          <td className="border border-blue-300 px-3 py-2">Preferenze interface utente</td>
                          <td className="border border-blue-300 px-3 py-2">90 giorni</td>
                        </tr>
                        <tr>
                          <td className="border border-blue-300 px-3 py-2">theme_preference</td>
                          <td className="border border-blue-300 px-3 py-2">Modalità chiara/scura (se implementata)</td>
                          <td className="border border-blue-300 px-3 py-2">1 anno</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cookie di Terze Parti */}
                <div className="border border-purple-200 bg-purple-50 p-6 rounded-lg">
                  <h3 className="font-bold text-purple-900 mb-3">🔗 Cookie di Terze Parti</h3>
                  <p className="text-purple-800 text-sm mb-4">
                    Questi cookie sono impostati da servizi di terze parti integrati nel nostro sito.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-purple-900 mb-2">Cal.com (Sistema di Prenotazione)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-purple-300 text-sm">
                          <thead className="bg-purple-100">
                            <tr>
                              <th className="border border-purple-300 px-3 py-2 text-left">Cookie</th>
                              <th className="border border-purple-300 px-3 py-2 text-left">Finalità</th>
                              <th className="border border-purple-300 px-3 py-2 text-left">Durata</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-purple-300 px-3 py-2">cal-session</td>
                              <td className="border border-purple-300 px-3 py-2">Funzionamento calendario prenotazioni</td>
                              <td className="border border-purple-300 px-3 py-2">Sessione</td>
                            </tr>
                            <tr className="bg-purple-25">
                              <td className="border border-purple-300 px-3 py-2">cal-booking-data</td>
                              <td className="border border-purple-300 px-3 py-2">Dati temporanei prenotazione</td>
                              <td className="border border-purple-300 px-3 py-2">1 ora</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-purple-700 text-xs mt-2">
                        Privacy Policy Cal.com: <a href="https://cal.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">https://cal.com/privacy</a>
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-purple-900 mb-2">Vercel (Hosting e CDN)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-purple-300 text-sm">
                          <thead className="bg-purple-100">
                            <tr>
                              <th className="border border-purple-300 px-3 py-2 text-left">Cookie</th>
                              <th className="border border-purple-300 px-3 py-2 text-left">Finalità</th>
                              <th className="border border-purple-300 px-3 py-2 text-left">Durata</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-purple-300 px-3 py-2">__vercel_live_token</td>
                              <td className="border border-purple-300 px-3 py-2">Ottimizzazione performance (solo sviluppo)</td>
                              <td className="border border-purple-300 px-3 py-2">Sessione</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-purple-700 text-xs mt-2">
                        Privacy Policy Vercel: <a href="https://vercel.com/legal/privacy-policy" className="underline" target="_blank" rel="noopener noreferrer">https://vercel.com/legal/privacy-policy</a>
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* 4. Base Giuridica */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Base Giuridica per l'Uso dei Cookie</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-900 mb-2">Cookie Tecnici</h3>
                  <p className="text-green-800 text-sm">
                    <strong>Base giuridica:</strong> Legittimo interesse (art. 6, par. 1, lett. f) GDPR<br/>
                    <strong>Motivo:</strong> Essenziali per il funzionamento del sito<br/>
                    <strong>Consenso:</strong> Non richiesto
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">Cookie di Funzionalità</h3>
                  <p className="text-blue-800 text-sm">
                    <strong>Base giuridica:</strong> Consenso (art. 6, par. 1, lett. a) GDPR<br/>
                    <strong>Motivo:</strong> Miglioramento esperienza utente<br/>
                    <strong>Consenso:</strong> Richiesto tramite banner
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <h3 className="font-semibold text-yellow-900 mb-2">🏛️ Riferimenti Normativi</h3>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• <strong>GDPR:</strong> Regolamento UE 2016/679</li>
                  <li>• <strong>ePrivacy Directive:</strong> Direttiva 2002/58/CE</li>
                  <li>• <strong>Codice Privacy:</strong> D.Lgs. 196/2003 (modificato)</li>
                  <li>• <strong>Linee Guida:</strong> Provvedimento Garante Privacy 8 maggio 2014</li>
                </ul>
              </div>
            </section>

            {/* 5. Come Gestiamo il Consenso */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Come Gestiamo il Consenso</h2>

              <div className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">🍪 Banner Cookie</h3>
                  <p className="text-blue-800 text-sm mb-3">
                    Al primo accesso al sito, appare un banner informativo che ti permette di:
                  </p>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Accettare tutti i cookie</li>
                    <li>• Rifiutare i cookie non essenziali</li>
                    <li>• Personalizzare le tue preferenze</li>
                    <li>• Leggere questa Cookie Policy completa</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">⚙️ Centro Preferenze</h3>
                  <p className="text-gray-700 text-sm mb-3">
                    Puoi modificare le tue preferenze sui cookie in qualsiasi momento attraverso:
                  </p>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Link "Impostazioni Cookie" nel footer del sito</li>
                    <li>• Sezione "Preferenze" nel tuo account (se registrato)</li>
                    <li>• Impostazioni del browser web</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">✅ Consenso Valido</h3>
                <p className="text-green-800 text-sm">
                  Il tuo consenso è considerato valido quando è: <strong>libero, specifico, informato e inequivocabile</strong>.
                  Puoi revocarlo in qualsiasi momento con la stessa facilità con cui lo hai dato.
                </p>
              </div>
            </section>

            {/* 6. Come Disabilitare i Cookie */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Come Disabilitare i Cookie</h2>
              <p className="mb-6">
                Puoi controllare e gestire i cookie in diversi modi. Ricorda che rimuovere o bloccare i cookie
                potrebbe influire sulla tua esperienza utente e alcune funzioni del sito potrebbero non funzionare correttamente.
              </p>

              <div className="space-y-6">

                {/* Impostazioni Browser */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">🌐 Impostazioni Browser</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                    <div className="bg-blue-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-blue-900 mb-2">Google Chrome</h4>
                      <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                        <li>Menu → Impostazioni</li>
                        <li>Privacy e sicurezza</li>
                        <li>Cookie e altri dati dei siti</li>
                        <li>Gestisci cookie</li>
                      </ol>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-orange-900 mb-2">Mozilla Firefox</h4>
                      <ol className="text-orange-800 text-sm space-y-1 list-decimal list-inside">
                        <li>Menu → Preferenze</li>
                        <li>Privacy e sicurezza</li>
                        <li>Cookie e dati dei siti web</li>
                        <li>Gestisci dati</li>
                      </ol>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-2">Safari</h4>
                      <ol className="text-gray-800 text-sm space-y-1 list-decimal list-inside">
                        <li>Preferenze → Privacy</li>
                        <li>Gestisci dati siti web</li>
                        <li>Rimuovi tutto/singoli</li>
                      </ol>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-purple-900 mb-2">Microsoft Edge</h4>
                      <ol className="text-purple-800 text-sm space-y-1 list-decimal list-inside">
                        <li>Menu → Impostazioni</li>
                        <li>Privacy, ricerca e servizi</li>
                        <li>Cookie e autorizzazioni sito</li>
                        <li>Gestisci cookie</li>
                      </ol>
                    </div>

                  </div>
                </div>

                {/* Navigazione Privata */}
                <div className="bg-gray-100 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">🕵️ Navigazione Privata/Incognito</h3>
                  <p className="text-gray-700 text-sm mb-3">
                    La modalità di navigazione privata non salva cookie, cronologia o dati temporanei:
                  </p>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• <strong>Chrome:</strong> Ctrl+Shift+N (Windows) / Cmd+Shift+N (Mac)</li>
                    <li>• <strong>Firefox:</strong> Ctrl+Shift+P (Windows) / Cmd+Shift+P (Mac)</li>
                    <li>• <strong>Safari:</strong> Cmd+Shift+N</li>
                    <li>• <strong>Edge:</strong> Ctrl+Shift+N</li>
                  </ul>
                </div>

                {/* Browser Mobile */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">📱 Dispositivi Mobile</h3>
                  <div className="grid md:grid-cols-2 gap-4">

                    <div className="bg-blue-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-blue-900 mb-2">iOS (iPhone/iPad)</h4>
                      <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                        <li>Impostazioni → Safari</li>
                        <li>Privacy e sicurezza</li>
                        <li>Blocca tutti i cookie</li>
                        <li>Cancella dati siti web</li>
                      </ol>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-green-900 mb-2">Android</h4>
                      <ol className="text-green-800 text-sm space-y-1 list-decimal list-inside">
                        <li>Chrome → Menu → Impostazioni</li>
                        <li>Impostazioni sito</li>
                        <li>Cookie</li>
                        <li>Attiva/Disattiva</li>
                      </ol>
                    </div>

                  </div>
                </div>

              </div>

              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400">
                <h3 className="font-semibold text-red-900 mb-2">⚠️ Attenzione</h3>
                <p className="text-red-800 text-sm">
                  Disabilitando tutti i cookie, alcune funzionalità del sito potrebbero non funzionare correttamente,
                  come l'accesso all'area riservata, le preferenze salvate e la funzionalità di prenotazione.
                </p>
              </div>
            </section>

            {/* 7. Cookie di Terze Parti - Dettagli */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Gestione Cookie di Terze Parti</h2>
              <p className="mb-6">
                Alcuni servizi integrati nel nostro sito utilizzano cookie propri. Puoi gestirli direttamente
                attraverso le impostazioni di questi servizi:
              </p>

              <div className="space-y-4">

                <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900 mb-1">Cal.com (Prenotazioni)</h3>
                      <p className="text-purple-800 text-sm mb-2">
                        Sistema di prenotazione appuntamenti integrato nelle pagine Servizi e Booking.
                      </p>
                      <ul className="text-purple-800 text-xs space-y-1">
                        <li>• Cookie per funzionamento calendario</li>
                        <li>• Preferenze fuso orario</li>
                        <li>• Dati temporanei prenotazione</li>
                      </ul>
                    </div>
                    <div className="ml-4 text-right">
                      <a
                        href="https://cal.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 text-xs underline hover:no-underline"
                      >
                        Privacy Policy →
                      </a>
                      <p className="text-purple-600 text-xs mt-1">Opt-out disponibile</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">🔗 Link Utili per Opt-out</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• <strong>Your Online Choices:</strong> <a href="https://www.youronlinechoices.com/" className="underline" target="_blank" rel="noopener noreferrer">www.youronlinechoices.com</a></li>
                  <li>• <strong>Network Advertising Initiative:</strong> <a href="https://optout.networkadvertising.org/" className="underline" target="_blank" rel="noopener noreferrer">optout.networkadvertising.org</a></li>
                  <li>• <strong>Digital Advertising Alliance:</strong> <a href="https://optout.aboutads.info/" className="underline" target="_blank" rel="noopener noreferrer">optout.aboutads.info</a></li>
                </ul>
              </div>
            </section>

            {/* 8. Local Storage e Session Storage */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Local Storage e Tecnologie Simili</h2>
              <p className="mb-4">
                Oltre ai cookie, utilizziamo altre tecnologie di archiviazione locale per migliorare la funzionalità del sito:
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">💾 Local Storage</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-700 mb-2"><strong>Cosa memorizza:</strong></p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Token di autenticazione per dashboard utenti</li>
                        <li>• Preferenze interfaccia utente</li>
                        <li>• Impostazioni video player</li>
                        <li>• Dati temporanei applicazione</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 mb-1"><strong>Come eliminare:</strong></p>
                      <p className="text-sm text-gray-600">
                        Impostazioni browser → Cancella dati di navigazione → Archiviazione locale
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">🔄 Session Storage</h3>
                  <p className="text-blue-800 text-sm">
                    Dati temporanei che vengono eliminati automaticamente alla chiusura del browser.
                    Utilizzato per il funzionamento dell'applicazione React e la navigazione tra le pagine.
                  </p>
                </div>
              </div>
            </section>

            {/* 9. Trasferimenti Internazionali */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Trasferimenti Internazionali di Dati</h2>
              <p className="mb-4">
                Alcuni cookie di terze parti potrebbero comportare trasferimenti di dati verso paesi extra-UE:
              </p>

              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <h3 className="font-semibold text-orange-900 mb-3">🌍 Paesi Coinvolti</h3>
                <div className="space-y-2 text-orange-800 text-sm">
                  <p><strong>Stati Uniti:</strong> Cal.com (con garanzie di protezione dati)</p>
                  <p><strong>Protezioni:</strong> Clausole Contrattuali Standard UE, Principi di Privacy Shield (dove applicabili)</p>
                  <p><strong>Diritti:</strong> Puoi sempre revocare il consenso e richiedere la cancellazione dei tuoi dati</p>
                </div>
              </div>
            </section>

            {/* 10. Aggiornamenti */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Aggiornamenti della Cookie Policy</h2>
              <p className="mb-4">
                Questa Cookie Policy viene aggiornata periodicamente per riflettere cambiamenti nei cookie utilizzati
                o modifiche normative.
              </p>

              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">📬 Come Ti Informiamo</h3>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Aggiornamento della data in cima al documento</li>
                    <li>• Notifica tramite banner sul sito per modifiche sostanziali</li>
                    <li>• Email ai utenti registrati (se applicabile)</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">📅 Controllo Regolare</h3>
                  <p className="text-green-800 text-sm">
                    Ti consigliamo di consultare periodicamente questa pagina per rimanere aggiornato
                    sulle nostre pratiche relative ai cookie e alle tue opzioni di controllo.
                  </p>
                </div>
              </div>
            </section>

            {/* Contatti */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contatti per Questioni sui Cookie</h2>
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="mb-4">
                  Per domande specifiche sui cookie utilizzati in questo sito o per esercitare i tuoi diritti:
                </p>
                <div className="space-y-2">
                  <p><strong>Joshua Maurizio - Personal Trainer</strong></p>
                  <p>Via Piero Bottoni 10, 20141 Milano (MI)</p>
                  <p>Email: [disponibile su richiesta]</p>
                  <p>Telefono: [disponibile su richiesta]</p>
                </div>

                <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-500">
                  <p className="text-sm text-gray-600">
                    <strong>Assistenza Tecnica:</strong> Per problemi tecnici con i cookie o le impostazioni del browser,
                    il nostro team di supporto è disponibile Lunedì-Venerdì, 9:00-17:00.
                  </p>
                </div>
              </div>
            </section>

            {/* Ultima Modifica */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Questa Cookie Policy è stata aggiornata l'ultima volta il {' '}
                <strong>{new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                <br />
                Versione 1.0 - Prima pubblicazione
              </p>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;