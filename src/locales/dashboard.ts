import { registerTranslations } from '../i18n';
import it from './it/dashboard.json';
import en from './en/dashboard.json';

// Imported by the client area (and by the admin, which shows check-in answers)
registerTranslations('dashboard', { it, en });
