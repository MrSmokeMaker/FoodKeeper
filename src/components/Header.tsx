import React from 'react';
import { Sparkles, Moon, Sun, Settings2, Zap } from 'lucide-react';
import type { UserProfile } from '../types';
import { triggerHaptic } from '../services/telegram';

interface HeaderProps {
  profile?: UserProfile;
  onOpenSettings: () => void;
  onOpenPaywall: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  onOpenSettings,
  onOpenPaywall,
  onToggleTheme,
  isDark,
}) => {
  const isPro = profile?.subscriptionTier === 'pro';

  return (
    <header className="sticky top-0 z-30 safe-top glass border-b border-zinc-200/60 dark:border-white/5 transition-colors">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                FoodKeeper
              </h1>
              {isPro ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30">
                  PRO
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  PWA
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Привет, {profile?.name || 'пользователь'}!
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Бейдж тарифа / кнопка Upgrade */}
          {isPro ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenPaywall();
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>PRO Активен</span>
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenPaywall();
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 flex items-center gap-1 hover:opacity-95 transform active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Тариф PRO</span>
            </button>
          )}

          {/* Переключатель темы */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleTheme();
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            aria-label="Сменить тему"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          {/* Кнопка настроек */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            aria-label="Настройки"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
