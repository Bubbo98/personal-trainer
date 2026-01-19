import React from 'react';
import { FiTrendingUp, FiExternalLink, FiCheckCircle, FiBarChart2, FiActivity, FiTarget } from 'react-icons/fi';

const AnalyticsManagement: React.FC = () => {
  const vercelProjectUrl = 'https://vercel.com/joshua-maurizios-projects/personal-trainer-prod/analytics';

  const features = [
    {
      icon: FiBarChart2,
      title: 'Visualizzazioni Pagina',
      description: 'Traccia il numero totale di visualizzazioni per ogni pagina del tuo sito'
    },
    {
      icon: FiActivity,
      title: 'Visitatori Unici',
      description: 'Monitora quanti visitatori unici accedono al tuo sito'
    },
    {
      icon: FiTarget,
      title: 'Dati Geografici',
      description: 'Scopri da quali paesi provengono i tuoi visitatori'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 shadow-lg text-white">
        <div className="flex items-center space-x-4 mb-4">
          {React.createElement(FiTrendingUp as React.ComponentType<{ className?: string }>, {
            className: "w-10 h-10"
          })}
          <div>
            <h2 className="text-3xl font-bold">Analytics del Sito</h2>
            <p className="text-blue-100 mt-1">
              Monitoraggio in tempo reale delle statistiche del tuo sito web
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-green-200">
        <div className="flex items-start space-x-4">
          {React.createElement(FiCheckCircle as React.ComponentType<{ className?: string }>, {
            className: "w-8 h-8 text-green-600 flex-shrink-0 mt-1"
          })}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Analytics Attivo e Funzionante
            </h3>
            <p className="text-gray-600 mb-4">
              Vercel Analytics è configurato e sta raccogliendo dati sul tuo sito. I dati vengono
              aggiornati in tempo reale e rispettano la privacy degli utenti in conformità con GDPR.
            </p>
            <a
              href={vercelProjectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              <span>Visualizza Dashboard Completa</span>
              {React.createElement(FiExternalLink as React.ComponentType<{ className?: string }>, {
                className: "w-5 h-5"
              })}
            </a>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                {React.createElement(feature.icon as React.ComponentType<{ className?: string }>, {
                  className: "w-6 h-6 text-blue-600"
                })}
              </div>
              <h3 className="font-bold text-gray-900">{feature.title}</h3>
            </div>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What You Can See */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-3 text-lg">
            Cosa puoi visualizzare nella Dashboard
          </h4>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Visualizzazioni pagina in tempo reale</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Visitatori unici e ricorrenti</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Distribuzione geografica dei visitatori</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Pagine più visitate</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Sorgenti di traffico (referral, direct, social)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Dispositivi e browser utilizzati</span>
            </li>
          </ul>
        </div>

        {/* Privacy & Performance */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h4 className="font-semibold text-green-900 mb-3 text-lg">
            Privacy e Performance
          </h4>
          <ul className="space-y-2 text-green-800">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Conforme GDPR e rispettoso della privacy</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Nessun cookie di terze parti</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Impatto zero sulle performance del sito</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Dati aggiornati in tempo reale</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Non richiede banner cookie</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Lightweight (~1KB di script)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA Bottom */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-8 text-center border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Pronto a vedere i tuoi dati?
        </h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Clicca sul pulsante qui sotto per accedere alla dashboard completa di Vercel Analytics
          e visualizzare tutte le statistiche dettagliate del tuo sito in tempo reale.
        </p>
        <a
          href={vercelProjectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg text-lg"
        >
          <span>Apri Dashboard Analytics</span>
          {React.createElement(FiExternalLink as React.ComponentType<{ className?: string }>, {
            className: "w-6 h-6"
          })}
        </a>
      </div>
    </div>
  );
};

export default AnalyticsManagement;
