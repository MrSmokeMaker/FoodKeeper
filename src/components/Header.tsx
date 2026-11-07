import React from 'react';
import { Moon, Sun, Settings2, Zap } from 'lucide-react';
import type { UserProfile } from '../types';
import { triggerHaptic } from '../services/telegram';
import { Logo } from './Logo';

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
    <header className="sticky top-0 z-30 safe-top glass border-b border-zinc-200/70 dark:border-white/5 transition-colors shadow-xs">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        <Logo size="sm" showText={true} />

        <div className="flex items-center space-x-1.5">
          {/* Бейдж тарифа / кнопка Upgrade */}
          {isPro ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenPaywall();
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/25 active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>PRO</span>
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenPaywall();
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 flex items-center gap-1 hover:opacity-95 active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>PRO</span>
            </button>
          )}

          {/* Переключатель темы */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleTheme();
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 active:scale-90 transition-all"
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
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 active:scale-90 transition-all"
            aria-label="Настройки"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
