import LegalPage from '../features/legal/LegalPage';
import it from '../features/legal/content/privacy.it';
import en from '../features/legal/content/privacy.en';

const PrivacyPolicy = () => <LegalPage docs={{ it, en }} path="/privacy-policy" />;

export default PrivacyPolicy;
