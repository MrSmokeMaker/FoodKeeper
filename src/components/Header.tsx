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
    <header className="sticky top-0 z-30 safe-top glass border-b border-zinc-200/50 dark:border-white/[0.06] transition-colors">
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
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 hover:bg-emerald-500/20 active:scale-95 transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>PRO</span>
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenPaywall();
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center gap-1 shadow-xs hover:opacity-90 active:scale-95 transition-all"
            >
              <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>PRO</span>
            </button>
          )}

          {/* Переключатель темы */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleTheme();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 active:scale-90 transition-all"
            aria-label="Сменить тему"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>

          {/* Кнопка настроек */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 active:scale-90 transition-all"
            aria-label="Настройки"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
