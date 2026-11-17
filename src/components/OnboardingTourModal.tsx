import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Refrigerator,
  Sparkles,
  ScanLine,
  ChefHat,
  CalendarDays,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'planner' | 'fridge' | 'scanner' | 'recipes' | 'shopping') => void;
}

interface TourStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  accentGradient: string;
  tip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    title: 'Умный холодильник',
    subtitle: 'Контроль свежести на светофоре',
    description:
      'Следите за продуктами дома: зелёный цвет — продукт свеж, жёлтый — срок подходит к концу (пора готовить!), красный — продукт истёк.',
    icon: Refrigerator,
    badge: 'Шаг 1 из 6',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    tip: '💡 Больше никакой испорченной еды в дальнем углу холодильника!',
  },
  {
    id: 2,
    title: 'Умный ввод (Smart FAB)',
    subtitle: 'Добавление за 2 секунды',
    description:
      'Пишите так, как думаете: «Творог 200г 3 дня» или «Молоко завтра». Приложение само поймет вес и рассчитает дату окончания срока годности.',
    icon: Sparkles,
    badge: 'Шаг 2 из 6',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    accentGradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
    tip: '⚡ Дополнительные поля КБЖУ свернуты и не мешают быстрому вводу.',
  },
  {
    id: 3,
    title: 'Сканер чеков и штрихкодов',
    subtitle: 'Импорт покупок в 1 клик',
    description:
      'Вернулись из супермаркета? Просто сфотографируйте чек или отсканируйте штрихкоды упаковок. Продукты автоматически добавятся на полку.',
    icon: ScanLine,
    badge: 'Шаг 3 из 6',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    accentGradient: 'from-emerald-500/20 via-cyan-500/10 to-transparent',
    tip: '📷 Быстрая кнопка по центру нижней панели открывает сканер.',
  },
  {
    id: 4,
    title: 'ИИ-Шеф и Zero-Waste',
    subtitle: 'Рецепты из того, что есть',
    description:
      'Искусственный интеллект анализирует продукты с истекающим сроком и собирает персональные пошаговые рецепты, спасая ваш бюджет и еду.',
    icon: ChefHat,
    badge: 'Шаг 4 из 6',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    accentGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    tip: '🍳 Нажмите «Приготовить», и ингредиенты автоматически спишутся.',
  },
  {
    id: 5,
    title: 'Рацион питания и КБЖУ',
    subtitle: 'Баланс калорий и пользы',
    description:
      'Планируйте приёмы пищи на неделю вперед. Приложение отслеживает калории, белки, жиры и углеводы под ваши персональные цели.',
    icon: CalendarDays,
    badge: 'Шаг 5 из 6',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    accentGradient: 'from-blue-500/20 via-sky-500/10 to-transparent',
    tip: '🥗 Умная генерация меню учитывает ваши предпочтения.',
  },
  {
    id: 6,
    title: 'Жесты и Список покупок',
    subtitle: 'Управление в одно касание',
    description:
      'Свайпайте карточки продуктов в холодильнике: вправо — «Съедено», влево — «В корзину». Закончившиеся продукты отправляйте в список покупок.',
    icon: CheckCircle2,
    badge: 'Шаг 6 из 6',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    accentGradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    tip: '🎯 Вы готовы! Начните сохранять свежесть прямо сейчас.',
  },
];

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    triggerHaptic('light');
    if (isLastStep) {
      triggerHaptic('success');
      onClose();
      if (onNavigateTab) {
        onNavigateTab('fridge');
      }
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    triggerHaptic('light');
    onClose();
  };

  const StepIcon = currentStep.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Интерактивное обучение FoodKeeper"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Фоновый градиент шага */}
        <div
          className={`absolute inset-x-0 top-0 h-44 bg-gradient-to-b ${currentStep.accentGradient} pointer-events-none transition-all duration-300`}
        />

        {/* Верхняя панель: Прогресс-точки и кнопка закрыть */}
        <div className="relative z-10 px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => {
                  triggerHaptic('light');
                  setCurrentStepIndex(idx);
                }}
                aria-label={`Перейти к шагу ${step.id}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-6 bg-emerald-500'
                    : idx < currentStepIndex
                    ? 'w-2 bg-emerald-500/40'
                    : 'w-2 bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            aria-label="Закрыть обучение"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors min-w-[32px] min-h-[32px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Основной контент шага с плавной анимацией смены */}
        <div className="relative z-10 px-6 py-4 flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${currentStep.badgeColor}`}
                >
                  {currentStep.badge}
                </span>

                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center shadow-sm">
                  <StepIcon className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {currentStep.title}
                </h3>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {currentStep.subtitle}
                </p>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed min-h-[4rem]">
                {currentStep.description}
              </p>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-[11px] text-zinc-700 dark:text-zinc-300">
                {currentStep.tip}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Нижняя панель действий (мишени ≥ 48px) */}
        <div className="relative z-10 px-6 pb-6 pt-2 flex items-center gap-3">
          {!isFirstStep && (
            <button
              onClick={handlePrev}
              aria-label="Назад"
              className="h-12 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 min-w-[48px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>
          )}

          <button
            onClick={handleNext}
            aria-label={isLastStep ? 'Начать пользоваться' : 'Следующий шаг'}
            className="flex-1 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
          >
            <span>{isLastStep ? 'Начать пользоваться' : 'Далее'}</span>
            {isLastStep ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
