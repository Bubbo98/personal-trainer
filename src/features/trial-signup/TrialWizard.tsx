import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FiArrowLeft, FiCheckCircle, FiMail, FiMessageCircle } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import { Checkbox, TextField } from '../../components/ui/Field';
import { Alert, ErrorState, LoadingState } from '../../components/ui/States';
import { CONTACT, TURNSTILE_SITE_KEY } from '../../config';
import { ApiError, publicApi } from '../../lib/api';
import { trackTrialSignup } from '../../lib/tracking';
import Turnstile from './Turnstile';
import {
  contactErrors,
  effectiveDiscipline,
  localized,
  questionsFor,
  signupBody,
  wizardSteps,
  type ContactForm,
  type Discipline,
  type PublicQuestionnaire,
} from './wizard';

const whatsappHref = (text: string) => `https://wa.me/${CONTACT.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

const choiceClass = (selected: boolean) =>
  `w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-colors ${
    selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400'
  }`;

const ContactUs = () => {
  const { t } = useTranslation('public');
  return (
    <a
      href={whatsappHref(t('trialSignup.whatsappMessage'))}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium bg-green-600 text-white hover:bg-green-700"
    >
      <FiMessageCircle className="w-5 h-5" aria-hidden />
      {t('trialSignup.whatsapp')}
    </a>
  );
};

type Result = { resent: boolean; emailSent: boolean };

const Done = ({ result, email }: { result: Result; email: string }) => {
  const { t } = useTranslation('public');
  if (!result.emailSent) {
    return (
      <div className="text-center space-y-4 py-4">
        <FiCheckCircle className="w-14 h-14 text-green-500 mx-auto" aria-hidden />
        <h2 className="text-2xl font-bold text-gray-900">{t('trialSignup.done.noEmailTitle')}</h2>
        <p className="text-gray-600">{t('trialSignup.done.noEmailMessage')}</p>
        <ContactUs />
      </div>
    );
  }
  return (
    <div className="text-center space-y-4 py-4">
      <FiMail className="w-14 h-14 text-gray-900 mx-auto" aria-hidden />
      <h2 className="text-2xl font-bold text-gray-900">{result.resent ? t('trialSignup.done.resentTitle') : t('trialSignup.done.title')}</h2>
      <p className="text-gray-600">{t('trialSignup.done.message', { email })}</p>
      <p className="text-sm text-gray-500">{t('trialSignup.done.spam')}</p>
    </div>
  );
};

const Wizard = ({ questionnaire }: { questionnaire: PublicQuestionnaire }) => {
  const { t, i18n } = useTranslation('public');
  const [chosen, setChosen] = useState<Discipline | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ContactForm>({ firstName: '', lastName: '', email: '', phone: '', privacy: false, marketing: false });
  const [showErrors, setShowErrors] = useState(false);
  // Bot checks: when the questionnaire appeared, a field only bots fill in, the Turnstile token
  const [startedAt] = useState(() => Date.now());
  const [website, setWebsite] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRound, setCaptchaRound] = useState(0);

  const discipline = effectiveDiscipline(questionnaire, chosen);
  const steps = wizardSteps(questionnaire, discipline);
  const current = steps[Math.min(step, steps.length - 1)];
  const questions = questionsFor(questionnaire.questions, discipline);
  const errors = contactErrors(form);

  const signup = useMutation({
    mutationFn: (elapsedMs: number) =>
      publicApi.post<Result>(
        '/trials/signup',
        signupBody(discipline!, answers, questionnaire.questions, form, i18n.language, { elapsedMs, website, captchaToken }),
      ),
    onSuccess: (result) => {
      if (!result.resent) trackTrialSignup();
    },
    // A Turnstile token works once: a new check for the next try
    onError: () => {
      if (TURNSTILE_SITE_KEY) setCaptchaRound((n) => n + 1);
    },
  });

  if (signup.data) return <Done result={signup.data} email={form.email.trim()} />;

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length === 0 && discipline) signup.mutate(Date.now() - startedAt);
  };

  const errorCode = signup.error instanceof ApiError ? signup.error.code : undefined;
  const fieldError = (key: keyof ContactForm) => (showErrors && errors[key] ? t(errors[key] as 'trialSignup.errors.email') : null);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>{t('trialSignup.step', { step: step + 1, total: steps.length })}</span>
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 hover:text-gray-900">
              <FiArrowLeft className="w-4 h-4" aria-hidden />
              {t('trialSignup.back')}
            </button>
          )}
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden" aria-hidden>
          <div className="h-full bg-gray-900 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {current === 'discipline' && (
        <fieldset className="space-y-3">
          <legend className="text-xl font-bold text-gray-900 mb-4">{t('trialSignup.disciplineQuestion')}</legend>
          {questionnaire.disciplines.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={chosen === d}
              onClick={() => {
                setChosen(d);
                next();
              }}
              className={choiceClass(chosen === d)}
            >
              <span className="block text-lg">{t(`trialSignup.disciplines.${d}.title`)}</span>
              <span className={`block text-sm font-normal mt-0.5 ${chosen === d ? 'text-gray-300' : 'text-gray-500'}`}>{t(`trialSignup.disciplines.${d}.text`)}</span>
            </button>
          ))}
        </fieldset>
      )}

      {current.startsWith('q:') &&
        (() => {
          const question = questions.find((q) => `q:${q.id}` === current)!;
          return (
            <fieldset className="space-y-3" key={question.id}>
              <legend className="text-xl font-bold text-gray-900 mb-4">{localized(question, i18n.language)}</legend>
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={answers[question.id] === option.id}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, [question.id]: option.id }));
                    next();
                  }}
                  className={choiceClass(answers[question.id] === option.id)}
                >
                  {localized(option, i18n.language)}
                </button>
              ))}
            </fieldset>
          );
        })()}

      {current === 'contact' && (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('trialSignup.contact.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('trialSignup.contact.subtitle', { days: questionnaire.trialDays })}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label={t('trialSignup.contact.firstName')} autoComplete="given-name" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} error={fieldError('firstName')} />
            <TextField label={t('trialSignup.contact.lastName')} autoComplete="family-name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </div>
          <TextField label={t('trialSignup.contact.email')} type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} error={fieldError('email')} hint={t('trialSignup.contact.emailHint')} />
          <TextField label={t('trialSignup.contact.phone')} type="tel" autoComplete="tel" required value={form.phone} onChange={(e) => set('phone', e.target.value)} error={fieldError('phone')} placeholder="+39 333 123 4567" />
          <div className="space-y-3 pt-1">
            <div>
              <Checkbox
                label={
                  <span>
                    {t('trialSignup.contact.privacyBefore')}
                    <Link to="/privacy-policy" target="_blank" className="underline">
                      {t('trialSignup.contact.privacyLink')}
                    </Link>
                    {t('trialSignup.contact.privacyAfter')}
                  </span>
                }
                checked={form.privacy}
                onChange={(e) => set('privacy', e.target.checked)}
              />
              {fieldError('privacy') && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {fieldError('privacy')}
                </p>
              )}
            </div>
            <Checkbox label={t('trialSignup.contact.marketing')} checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} />
          </div>

          {/* Trap for bots: hidden from people and screen readers */}
          <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} lang={i18n.language} onToken={setCaptchaToken} resetKey={captchaRound} />}

          {signup.isError && (
            <Alert kind="error">
              {errorCode === 'TRIAL_ALREADY_USED'
                ? t('trialSignup.errors.alreadyUsed')
                : errorCode === 'TRIAL_UNAVAILABLE'
                  ? t('trialSignup.errors.unavailable')
                  : errorCode === 'TOO_MANY_SIGNUPS'
                    ? t('trialSignup.errors.tooMany')
                    : errorCode === 'CAPTCHA_FAILED'
                      ? t('trialSignup.errors.captcha')
                      : t('trialSignup.errors.generic')}
            </Alert>
          )}
          {errorCode === 'TRIAL_ALREADY_USED' && <ContactUs />}

          <Button type="submit" size="lg" fullWidth loading={signup.isPending}>
            {t('trialSignup.contact.submit')}
          </Button>
        </form>
      )}
    </div>
  );
};

/** The online trial: questionnaire, contacts, access link by email. */
const TrialWizard = () => {
  const { t } = useTranslation('public');
  const questionnaire = useQuery({
    queryKey: ['public', 'trial-questionnaire'],
    queryFn: ({ signal }) => publicApi.get<PublicQuestionnaire>('/trials/questionnaire', signal),
    staleTime: 5 * 60_000,
  });

  if (questionnaire.isPending) return <LoadingState />;
  if (questionnaire.isError) return <ErrorState message={t('trialSignup.errors.load')} onRetry={() => questionnaire.refetch()} />;
  if (questionnaire.data.disciplines.length === 0) {
    return (
      <div className="text-center space-y-4 py-4">
        <p className="text-gray-700">{t('trialSignup.errors.unavailable')}</p>
        <ContactUs />
      </div>
    );
  }
  return <Wizard questionnaire={questionnaire.data} />;
};

export default TrialWizard;
