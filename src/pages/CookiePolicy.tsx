import LegalPage from '../features/legal/LegalPage';
import it from '../features/legal/content/cookies.it';
import en from '../features/legal/content/cookies.en';

const CookiePolicy = () => <LegalPage docs={{ it, en }} path="/cookie-policy" />;

export default CookiePolicy;
