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
      label: 'Продукты',
      icon: Refrigerator,
      badge: pantryExpiringCount > 0 ? pantryExpiringCount : undefined,
    },
    { id: 'scanner' as TabType, label: 'Скан', icon: ScanLine, highlight: true },
    { id: 'recipes' as TabType, label: 'Рецепты', icon: ChefHat },
    {
      id: 'shopping' as TabType,
      label: 'Покупки',
      icon: ShoppingCart,
      badge: shoppingPendingCount > 0 ? shoppingPendingCount : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-40 px-4 pointer-events-none safe-bottom">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="floating-dock rounded-full px-2 py-1.5 flex items-center justify-between">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.highlight) {
              return (
                <div key={tab.id} className="relative flex flex-col items-center mx-1">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 focus:outline-none transition-colors"
                    aria-label={tab.label}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </motion.button>
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex-1 py-1 flex flex-col items-center justify-center rounded-full transition-all focus:outline-none group"
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 bg-zinc-900/5 dark:bg-white/10 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.3]'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 stroke-[1.8]'
                    }`}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-2 min-w-[15px] h-3.5 px-1 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
