import React from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiMail, FiClock, FiUser, FiFileText } from 'react-icons/fi';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className=" px-6 lg:px-10 py-12 flex flex-col md:flex-row items-center gap-8">
         {/* Sezione 1 - Logo 1 */}
            <div className="flex-shrink-0">
              <img
                src="/Logo/logo1.jpg"
                alt="Logo Partner"
                className="h-24 sm:h-32 md:h-40 lg:h-48 xl:h-56 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>

            {/* Sezione 2 - Contenuto Centrale */}
            <div className='flex-1 flex flex-col space-y-8'>
        <div className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Informazioni Personali */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-6">Personal Trainer</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                {React.createElement(FiUser as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400 flex-shrink-0" })}
                <span className="text-gray-300">Joshua Maurizio</span>
              </div>
              <div className="flex items-start space-x-3">
                {React.createElement(FiMapPin as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" })}
                <div className="text-gray-300">
                  <div>Via Piero Bottoni 10</div>
                  <div>20141 Milano (MI)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Orari di Lavoro */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-6">Orari</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" })}
                <div className="text-gray-300">
                  <div className="font-medium text-white mb-2">Lunedì - Venerdì</div>
                  <div className="text-sm space-y-1">
                    <div>🏋️ Allenamenti: 9:00 - 17:00</div>
                    <div>💬 Consulenze: 17:00 - 19:00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-6">Contatti</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                {React.createElement(FiPhone as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400 flex-shrink-0" })}
                <a href="tel:+393282062823" className="text-gray-300 hover:text-white transition-colors">
                  +39 328 206 2823
                </a>
              </div>
              <div className="flex items-center space-x-3">
                {React.createElement(FiMail as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400 flex-shrink-0" })}
                <a href="mailto:josh17111991@gmail.com" className="text-gray-300 hover:text-white transition-colors">
                  josh17111991@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Informazioni Legali */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-6">Dati Fiscali</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                {React.createElement(FiFileText as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" })}
                <div className="text-gray-300 text-sm space-y-1">
                  <div>
                    <span className="text-gray-400">CF:</span> MRZJSH91S17F205F
                  </div>
                  <div>
                    <span className="text-gray-400">P.IVA:</span> 10657880968
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
          {/* Links legali */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row md:justify-between items-center">
          {/* Sezione Partner */}
        
          <div className="flex space-x-4 items-center min-h-[100px]">

           
            {/* Sezione 2 - Informazioni Centro */}
            <div className="text-center space-y-3">
              <div className="text-gray-400 text-sm">
                © {new Date().getFullYear()} Joshua Maurizio - Personal Trainer
              </div>
              <div className="text-gray-500 text-xs">
                Tutti i diritti riservati
              </div>
            </div>

           
          </div>
          <div className="flex flex-wrap justify-center space-x-6 text-sm">
            <Link
              to="/privacy-policy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Termini di Servizio
            </Link>
            <Link
              to="/cookie-policy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>

        

        {/* Disclaimer professionale */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="text-xs text-gray-500 text-center space-y-2">
            <p>
              🏃‍♂️ Personal Trainer qualificato e certificato - Milano
            </p>
            <p>
              I programmi di allenamento sono personalizzati e sviluppati in base alle esigenze individuali.
              Si consiglia sempre di consultare un medico prima di iniziare qualsiasi programma di fitness.
            </p>
          </div>
        </div>
 </div>
       {/* Sezione 3 - Logo 2 e Link */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center space-y-3">
              <img
                src="/Logo/logo2.jpg"
                alt="Allenamento Funzionale Milano"
                className="h-24 sm:h-32 md:h-40 lg:h-48 xl:h-56 w-auto object-contain"
              />
              <div className="text-center">
                <div className="text-gray-300 text-sm font-medium">
                  Allenamento Funzionale Milano
                </div>
                <a
                  href="https://www.allenamentofunzionalemilano.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 text-xs hover:text-white transition-colors underline block mt-1"
                >
                  www.allenamentofunzionalemilano.net
                </a>
              </div>
        </div>

        

     
            </div>

    </footer>
  );
};

export default Footer;