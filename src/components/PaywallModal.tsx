import React from 'react';
import { X, Check, Sparkles, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../services/telegram';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeToPro: () => Promise<void>;
  currentTier: 'free' | 'pro';
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onUpgradeToPro,
  currentTier,
}) => {
  if (!isOpen) return null;

  const handleUpgrade = async () => {
    triggerHaptic('success');
    await onUpgradeToPro();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#10b981', '#3b82f6'],
    });
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const proFeatures = [
    { title: 'Безлимитный ИИ-сканер этикеток', desc: 'Распознавание любых упаковок, составов и сроков годности без лимитов (на Free — 7 сканирований в день).' },
    { title: 'ИИ-нутрициолог на 7 дней', desc: 'Автоматическая сборка 28 приёмов пищи под ваш суточный калораж с точными граммовками.' },
    { title: 'Точечная замена блюд в 1 клик', desc: 'Не нравится блюдо? ИИ мгновенно подберет альтернативу с сохранением дневного баланса КБЖУ.' },
    { title: 'Импорт любых рецептов по ссылке', desc: 'Вставьте ссылку с любого кулинарного сайта — ИИ извлечет ингредиенты, точные граммовки и КБЖУ на порцию.' },
    { title: 'Поиск в глобальной онлайн-библиотеке', desc: 'Генерация рецептов по любым ингредиентам или названиям блюд.' },
    { title: 'Умный список покупок и Telegram', desc: 'Автоматический экспорт недостающих ингредиентов в Telegram-чат.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-amber-500/30">
        {/* Шапка с градиентом */}
        <div className="relative p-5 bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-transparent border-b border-zinc-200/80 dark:border-white/5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-200/50 dark:bg-zinc-800/60 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" /> PRO ТАРИФ
            </span>
            <span className="text-xs text-zinc-500">499 ₽ / месяц</span>
          </div>

          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Индивидуальный ИИ-диетолог и полный контроль рациона
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Экономьте до 5 000 ₽ в месяц за счёт умного использования запасов и достигайте целевого веса в 2 раза быстрее.
          </p>
        </div>

        {/* Список фич */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl text-xs mb-3">
            <div className="p-2 text-center rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
              <span className="text-[10px] text-zinc-400 block">Текущий тариф</span>
              <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                {currentTier === 'pro' ? 'PRO ✨' : 'FREE (7 сканов/день)'}
              </span>
            </div>
            <div className="p-2 text-center rounded-xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                FoodKeeper PRO
              </span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                499 ₽/мес
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {proFeatures.map((f, i) => (
              <div key={i} className="flex items-start space-x-3 p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{f.title}</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Футер */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-white/5 space-y-2">
          {currentTier === 'pro' ? (
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> PRO-подписка активна
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition-all transform active:scale-95"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Подключить PRO за 499 ₽ / месяц</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
          <p className="text-[10px] text-center text-zinc-400">
            Оплата картой РФ / СБП / Telegram Stars. Отмена подписки в любой момент в 1 клик.
          </p>
        </div>
      </div>
    </div>
  );
};
