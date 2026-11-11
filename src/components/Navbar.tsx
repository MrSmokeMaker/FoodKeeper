import React from 'react';
import { Home, Refrigerator, ScanLine, ChefHat, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabType = 'dashboard' | 'fridge' | 'scanner' | 'recipes' | 'shopping';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pantryExpiringCount?: number;
  shoppingPendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pantryExpiringCount = 0,
  shoppingPendingCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Главная', icon: Home },
    {
      id: 'fridge' as TabType,
      label: 'Холодильник',
      icon: Refrigerator,
      badge: pantryExpiringCount > 0 ? pantryExpiringCount : undefined,
    },
    { id: 'scanner' as TabType, label: 'Сканер', icon: ScanLine, highlight: true },
    { id: 'recipes' as TabType, label: 'Рецепты', icon: ChefHat },
    {
      id: 'shopping' as TabType,
      label: 'Покупки',
      icon: ShoppingCart,
      badge: shoppingPendingCount > 0 ? shoppingPendingCount : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background-light/85 dark:bg-background-dark/85 backdrop-blur-xl border-t border-zinc-200/70 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] safe-bottom">
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-between relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.highlight) {
            return (
              <div key={tab.id} className="relative flex flex-col items-center -top-3.5 mx-1">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center group focus:outline-none"
                  aria-label={tab.label}
                >
                  <motion.div
                    whileHover={{ scale: 1.07 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-3 border-white dark:border-zinc-950 transition-shadow group-hover:shadow-emerald-500/50"
                  >
                    <Icon className="w-6 h-6 stroke-[2.3]" />
                  </motion.div>
                  <span className="text-[10px] font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                    {tab.label}
                  </span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 py-1 flex flex-col items-center justify-center rounded-2xl transition-all focus:outline-none group"
            >
              {isActive && (
                <motion.div
                  layoutId="navbar-active-pill"
                  className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.4]'
                      : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
