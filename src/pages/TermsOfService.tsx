import LegalPage from '../features/legal/LegalPage';
import it from '../features/legal/content/terms.it';
import en from '../features/legal/content/terms.en';

const TermsOfService = () => <LegalPage docs={{ it, en }} path="/terms-of-service" />;

export default TermsOfService;
