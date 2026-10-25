import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiArrowDown, FiArrowUp, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/Field';
import { Alert, ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { formatDateTime } from '../../../lib/format';
import { adminKeys, useTrialQuestionnaire } from '../queries';
import { emptyQuestion, newId, questionType, scoreRange } from './helpers';
import { DISCIPLINES, QUESTION_TYPES, WEEK_DAYS, type Discipline, type Question, type QuestionOption, type QuestionType, type Questionnaire } from './types';

const cell = inputClass.replace('px-4 py-2.5', 'px-3 py-2').replace('rounded-xl', 'rounded-lg') + ' text-sm';

const OptionRow = ({ option, scored, onChange, onRemove, canRemove }: { option: QuestionOption; scored: boolean; onChange: (o: QuestionOption) => void; onRemove: () => void; canRemove: boolean }) => {
  const { t } = useTranslation('admin');
  return (
    <li className={`grid gap-2 items-center ${scored ? 'grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_2fr_5rem_auto]' : 'grid-cols-[1fr_auto] sm:grid-cols-[2fr_2fr_auto]'}`}>
      <input aria-label={t('trials.questionnaire.answerText')} placeholder={t('trials.questionnaire.answerText')} value={option.text} onChange={(e) => onChange({ ...option, text: e.target.value })} className={cell} />
      <input
        aria-label={t('trials.questionnaire.answerTextEn')}
        placeholder={t('trials.questionnaire.answerTextEn')}
        value={option.textEn ?? ''}
        onChange={(e) => onChange({ ...option, textEn: e.target.value })}
        className={`${cell} hidden sm:block`}
      />
      {scored && (
        <input
          aria-label={t('trials.questionnaire.points')}
          title={t('trials.questionnaire.points')}
          type="number"
          step={1}
          value={option.points}
          onChange={(e) =>
            onChange({
              ...option,
              points: e.target.value === '' ? 0 : Math.trunc(Number(e.target.value)),
            })
          }
          className={`${cell} w-20`}
        />
      )}
      <button type="button" onClick={onRemove} disabled={!canRemove} className="p-2 text-red-400 hover:text-red-600 disabled:opacity-30" aria-label={t('trials.questionnaire.removeAnswer')}>
        <FiTrash2 className="w-4 h-4" aria-hidden />
      </button>
    </li>
  );
};

const QuestionCard = ({
  question,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  question: Question;
  index: number;
  total: number;
  onChange: (q: Question) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation('admin');
  const setOption = (i: number, option: QuestionOption) =>
    onChange({
      ...question,
      options: question.options.map((o, j) => (j === i ? option : o)),
    });
  const type = questionType(question);
  // An open question has no answers to pick: back to a choice, it gets two empty ones
  const setType = (next: QuestionType) => {
    const options = next !== 'open' && question.options.length < 2 ? emptyQuestion([]).options : question.options;
    onChange({ ...question, type: next, options });
  };

  return (
    <li className="bg-white rounded-xl shadow p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-500">{t('trials.questionnaire.questionNumber', { number: index + 1 })}</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" aria-label={t('trials.questionnaire.moveUp')}>
            <FiArrowUp className="w-4 h-4" aria-hidden />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" aria-label={t('trials.questionnaire.moveDown')}>
            <FiArrowDown className="w-4 h-4" aria-hidden />
          </button>
          <button type="button" onClick={onRemove} className="p-2 rounded-lg text-red-500 hover:bg-red-50" aria-label={t('trials.questionnaire.removeQuestion')}>
            <FiTrash2 className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <input
          aria-label={t('trials.questionnaire.questionText')}
          placeholder={t('trials.questionnaire.questionText')}
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          className={cell}
        />
        <input
          aria-label={t('trials.questionnaire.questionTextEn')}
          placeholder={t('trials.questionnaire.questionTextEn')}
          value={question.textEn ?? ''}
          onChange={(e) => onChange({ ...question, textEn: e.target.value })}
          className={cell}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          {t('trials.questionnaire.askedTo')}
          <select
            value={question.discipline ?? ''}
            onChange={(e) =>
              onChange({
                ...question,
                discipline: (e.target.value || null) as Discipline | null,
              })
            }
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">{t('trials.questionnaire.everyone')}</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {t(`trials.discipline.${d}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          {t('trials.questionnaire.type')}
          <select value={type} onChange={(e) => setType(e.target.value as QuestionType)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
            {QUESTION_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`trials.questionnaire.types.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type === 'open' ? (
        <p className="text-sm text-gray-500">{t('trials.questionnaire.openHint')}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {question.options.map((option, i) => (
              <OptionRow
                key={option.id}
                option={option}
                scored={type === 'scored'}
                canRemove={question.options.length > 2}
                onChange={(o) => setOption(i, o)}
                onRemove={() =>
                  onChange({
                    ...question,
                    options: question.options.filter((_, j) => j !== i),
                  })
                }
              />
            ))}
          </ul>
          {question.options.length < 8 && (
            <Button
              size="sm"
              variant="ghost"
              icon={<FiPlus className="w-4 h-4" aria-hidden />}
              onClick={() =>
                onChange({
                  ...question,
                  options: [
                    ...question.options,
                    {
                      id: newId(question.options.map((o) => o.id)),
                      text: '',
                      textEn: '',
                      points: 0,
                    },
                  ],
                })
              }
            >
              {t('trials.questionnaire.addAnswer')}
            </Button>
          )}
        </>
      )}
    </li>
  );
};

const Editor = ({ initial, isDefault, updatedAt }: { initial: Questionnaire; isDefault: boolean; updatedAt: string | null }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>(initial.questions);
  const [dayOptions, setDayOptions] = useState<number[]>(initial.dayOptions);
  const [dirty, setDirty] = useState(false);
  const toggleDay = (day: number) => {
    setDayOptions((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort((a, b) => a - b)));
    setDirty(true);
  };

  const change = (next: Question[]) => {
    setQuestions(next);
    setDirty(true);
  };
  const move = (i: number, delta: number) => {
    const next = [...questions];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    change(next);
  };

  const save = useMutation({
    mutationFn: () => adminApi.put('/admin/trial-questionnaire', { dayOptions, questions }),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: adminKeys.trialQuestionnaire });
      toast.success(t('trials.questionnaire.saved'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('trials.questionnaire.title')}</h2>
          <p className="text-sm text-gray-600">{t('trials.questionnaire.subtitle')}</p>
        </div>
        <Button icon={<FiSave className="w-4 h-4" aria-hidden />} onClick={() => save.mutate()} loading={save.isPending} disabled={(!dirty && !isDefault) || dayOptions.length < 2}>
          {t('actions.save')}
        </Button>
      </div>

      {isDefault ? (
        <Alert kind="info">{t('trials.questionnaire.isDefault')}</Alert>
      ) : (
        updatedAt && (
          <p className="text-xs text-gray-500">
            {t('trials.questionnaire.updatedAt', {
              date: formatDateTime(updatedAt),
            })}
          </p>
        )
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {DISCIPLINES.map((d) => {
          const { min, max } = scoreRange({ questions }, d);
          return (
            <p key={d} className="bg-white rounded-xl shadow px-4 py-3 text-sm text-gray-700">
              <strong>{t(`trials.discipline.${d}`)}</strong>: {t('trials.questionnaire.range', { min, max })}
            </p>
          );
        })}
      </div>

      <fieldset className="bg-white rounded-xl shadow p-4 sm:p-5 space-y-3">
        <legend className="sr-only">{t('trials.questionnaire.daysTitle')}</legend>
        <div>
          <p className="font-semibold text-gray-900">{t('trials.questionnaire.daysTitle')}</p>
          <p className="text-sm text-gray-600">{t('trials.questionnaire.daysHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((day) => (
            <label
              key={day}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${dayOptions.includes(day) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700'}`}
            >
              <input type="checkbox" className="sr-only" checked={dayOptions.includes(day)} onChange={() => toggleDay(day)} />
              {t('trials.questionnaire.daysOption', { count: day })}
            </label>
          ))}
        </div>
        {dayOptions.length < 2 && <p className="text-sm text-red-600">{t('trials.questionnaire.daysTooFew')}</p>}
      </fieldset>

      <ol className="space-y-4">
        {questions.map((question, i) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={i}
            total={questions.length}
            onChange={(q) => change(questions.map((x, j) => (j === i ? q : x)))}
            onMove={(delta) => move(i, delta)}
            onRemove={() => change(questions.filter((_, j) => j !== i))}
          />
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        {questions.length < 20 && (
          <Button variant="secondary" icon={<FiPlus className="w-4 h-4" aria-hidden />} onClick={() => change([...questions, emptyQuestion(questions.map((q) => q.id))])}>
            {t('trials.questionnaire.addQuestion')}
          </Button>
        )}
        {dirty && (
          <Button icon={<FiSave className="w-4 h-4" aria-hidden />} onClick={() => save.mutate()} loading={save.isPending} disabled={dayOptions.length < 2}>
            {t('actions.saveChanges')}
          </Button>
        )}
      </div>
    </div>
  );
};

/** /admin/trials/questionnaire — the questions of the online trial and the points of each answer. */
const QuestionnaireEditor = () => {
  const errorMessage = useErrorMessage();
  const questionnaire = useTrialQuestionnaire();
  if (questionnaire.isPending) return <LoadingState />;
  if (questionnaire.isError) return <ErrorState message={errorMessage(questionnaire.error)} onRetry={() => questionnaire.refetch()} />;
  const { questionnaire: initial, isDefault, updatedAt } = questionnaire.data;
  return <Editor key={updatedAt ?? 'default'} initial={initial} isDefault={isDefault} updatedAt={updatedAt} />;
};

export default QuestionnaireEditor;
