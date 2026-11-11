import { useState } from 'react';
import { X, Target, Calculator, Check, Zap, Globe } from 'lucide-react';
import type { UserProfile } from '../types';
import { triggerHaptic } from '../services/telegram';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserProfile;
  onSaveProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onOpenPaywall: () => void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onOpenPaywall,
}: SettingsModalProps) => {
  if (!isOpen) return null;

  const [name, setName] = useState(profile?.name || '');
  const [proxyUrl, setProxyUrl] = useState(profile?.geminiProxyUrl || '');
  const [apiKey, setApiKey] = useState(profile?.geminiApiKey || '');
  const [targetCalories, setTargetCalories] = useState(profile?.targetCalories || 2000);
  const [targetProtein, setTargetProtein] = useState(profile?.targetProtein || 140);
  const [targetFat, setTargetFat] = useState(profile?.targetFat || 70);
  const [targetCarbs, setTargetCarbs] = useState(profile?.targetCarbs || 210);
  const [currentWeight, setCurrentWeight] = useState(profile?.currentWeight || 75);
  const [targetWeight, setTargetWeight] = useState(profile?.targetWeight || 70);

  const [saved, setSaved] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Калькулятор КБЖУ
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState(28);
  const [height, setHeight] = useState(178);
  const [activity, setActivity] = useState(1.375);
  const [goal, setGoal] = useState<'cut' | 'maintain' | 'bulk'>('cut');

  const isPro = profile?.subscriptionTier === 'pro';

  const calculateNorm = () => {
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
    triggerHaptic('medium');
  };

  const handleSave = async () => {
    await onSaveProfile({
      name,
      geminiProxyUrl: proxyUrl.trim(),
      geminiApiKey: apiKey.trim(),
      targetCalories,
      targetProtein,
      targetFat,
      targetCarbs,
      currentWeight,
      targetWeight,
    });
    setSaved(true);
    triggerHaptic('success');
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-background-light dark:bg-background-dark w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-200 dark:border-white/10">
        {/* Заголовок */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Настройки профиля
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Блок Тарифа */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-500" /> Тариф: {isPro ? 'FoodKeeper PRO ✨' : 'Базовый (FREE)'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isPro
                  ? 'Безлимитный ИИ-сканер, меню на 7 дней и авто-замена блюд'
                  : '7 ИИ-сканирований в день и безлимитный холодильник'}
              </p>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenPaywall();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 shrink-0 ml-2"
            >
              {isPro ? 'О тарифе' : '499 ₽/мес'}
            </button>
          </div>

          {/* Имя */}
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300 block mb-1">
              Ваше имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
            />
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
              <div className="p-3 bg-background-light dark:bg-background-dark rounded-xl space-y-2.5 text-xs border border-emerald-500/30">
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
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500">Целевой вес (кг)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10"
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
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 text-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Белки (г)</label>
                <input
                  type="number"
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 text-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Жиры (г)</label>
                <input
                  type="number"
                  value={targetFat}
                  onChange={(e) => setTargetFat(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 text-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Углев (г)</label>
                <input
                  type="number"
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-center text-xs font-bold rounded-lg bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 text-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Расширенные настройки (Прокси) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              {showAdvanced ? 'Скрыть прокси' : 'Настройка сетевого прокси'}
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-2 border border-zinc-200 dark:border-white/10">
                <div className="mb-2.5">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                    API-ключ Gemini (Google AI Studio):
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AQ.Ab8... или AIzaSy..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Хранится локально на вашем устройстве в защищённом хранилище.
                  </span>
                </div>

                <label className="text-[11px] text-zinc-500 block">
                  Кастомный Proxy URL для обхода региональных ограничений:
                </label>
                <input
                  type="text"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="https://pqeicvohoegcczvdxtiz.supabase.co/functions/v1/gemini-proxy"
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 font-mono"
                />
              </div>
            )}
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
              <span>Сохранить</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
