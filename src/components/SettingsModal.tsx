import { useState } from 'react';
import { X, Key, Globe, Target, Calculator, Check, AlertCircle } from 'lucide-react';
import type { UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserProfile;
  onSaveProfile: (updated: Partial<UserProfile>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(profile?.name || '');
  const [apiKey, setApiKey] = useState(profile?.geminiApiKey || '');
  const [proxyUrl, setProxyUrl] = useState(profile?.geminiProxyUrl || '');
  const [targetCalories, setTargetCalories] = useState(profile?.targetCalories || 2000);
  const [targetProtein, setTargetProtein] = useState(profile?.targetProtein || 140);
  const [targetFat, setTargetFat] = useState(profile?.targetFat || 70);
  const [targetCarbs, setTargetCarbs] = useState(profile?.targetCarbs || 210);
  const [currentWeight, setCurrentWeight] = useState(profile?.currentWeight || 75);
  const [targetWeight, setTargetWeight] = useState(profile?.targetWeight || 70);

  const [saved, setSaved] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // Калькулятор КБЖУ
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState(28);
  const [height, setHeight] = useState(178);
  const [activity, setActivity] = useState(1.375); // 1.2, 1.375, 1.55, 1.725
  const [goal, setGoal] = useState<'cut' | 'maintain' | 'bulk'>('cut');

  const calculateNorm = () => {
    // Формула Миффлина — Сан-Жеора
    let bmr = 10 * currentWeight + 6.25 * height - 5 * age;
    bmr += gender === 'male' ? 5 : -161;

    let tdee = bmr * activity;
    if (goal === 'cut') tdee -= 400;
    if (goal === 'bulk') tdee += 350;

    const cal = Math.round(tdee);
    const p = Math.round(currentWeight * 1.8);
    const f = Math.round((cal * 0.25) / 9);
    const c = Math.round((cal - (p * 4 + f * 9)) / 4);

    setTargetCalories(cal);
    setTargetProtein(p);
    setTargetFat(f);
    setTargetCarbs(c);
    setCalcOpen(false);
  };

  const handleSave = async () => {
    await onSaveProfile({
      name,
      geminiApiKey: apiKey.trim(),
      geminiProxyUrl: proxyUrl.trim(),
      targetCalories,
      targetProtein,
      targetFat,
      targetCarbs,
      currentWeight,
      targetWeight,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-200 dark:border-white/10">
        {/* Заголовок */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Настройки и ИИ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Блок ИИ и Прокси */}
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> Google Gemini API
              </span>
              <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-zinc-600 dark:text-zinc-400">
                Распознавание и Меню
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300 block mb-1">
                Имя пользователя
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300 block mb-1">
                API Ключ (Gemini API Key)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Без ключа работает реалистичный демо-режим со встроенными ответами.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 mb-1">
                <Globe className="w-3.5 h-3.5 text-emerald-500" /> Прокси / Базовый URL (Обход блокировок)
              </label>
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setProxyUrl('https://generativelanguage.googleapis.com')}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500"
                >
                  Оригинал Google
                </button>
                <button
                  type="button"
                  onClick={() => setProxyUrl('https://gemini-proxy.workers.dev')}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500"
                >
                  Cloudflare Proxy
                </button>
              </div>
              <div className="flex items-start gap-1.5 mt-2 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Прокси перенаправляет запросы через неподсанкционный регион, исключая ошибку <b>User location is not supported</b>.
                </span>
              </div>
            </div>
          </div>

          {/* Цели КБЖУ и Вес */}
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Суточные нормы (КБЖУ)
              </span>
              <button
                type="button"
                onClick={() => setCalcOpen(!calcOpen)}
                className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <Calculator className="w-3.5 h-3.5" />
                {calcOpen ? 'Скрыть калькулятор' : 'Рассчитать'}
              </button>
            </div>

            {calcOpen && (
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl space-y-2.5 text-xs border border-emerald-500/30">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400">Пол</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0"
                    >
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Возраст</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400">Рост (см)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Активность</label>
                    <select
                      value={activity}
                      onChange={(e) => setActivity(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0"
                    >
                      <option value={1.2}>Сидячий образ</option>
                      <option value={1.375}>Умеренная (1-3 тр.)</option>
                      <option value={1.55}>Высокая (3-5 тр.)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400">Цель</label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as any)}
                    className="w-full p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0"
                  >
                    <option value="cut">Похудение (-400 ккал)</option>
                    <option value="maintain">Поддержание</option>
                    <option value="bulk">Набор массы (+350)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={calculateNorm}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
                >
                  Применить расчет
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-500">Текущий вес (кг)</label>
                <input
                  type="number"
                  step="0.1"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500">Целевой вес (кг)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Ккал</label>
                <input
                  type="number"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Белки (г)</label>
                <input
                  type="number"
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Жиры (г)</label>
                <input
                  type="number"
                  value={targetFat}
                  onChange={(e) => setTargetFat(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Углев (г)</label>
                <input
                  type="number"
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-white/5 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center space-x-1.5 transition-all"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Сохранено!</span>
              </>
            ) : (
              <span>Сохранить настройки</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
