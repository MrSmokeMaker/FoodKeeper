import { Home, Refrigerator, ScanLine, ChefHat, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabType = 'dashboard' | 'fridge' | 'scanner' | 'recipes' | 'planner';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pantryExpiringCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, pantryExpiringCount = 0 }) => {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Главная', icon: Home },
    { id: 'fridge' as TabType, label: 'Холодильник', icon: Refrigerator, badge: pantryExpiringCount > 0 ? pantryExpiringCount : undefined },
    { id: 'scanner' as TabType, label: 'Сканер', icon: ScanLine, highlight: true },
    { id: 'recipes' as TabType, label: 'Рецепты', icon: ChefHat },
    { id: 'planner' as TabType, label: 'План 7 дн', icon: CalendarDays },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="max-w-md mx-auto px-4 pb-2 pt-1">
        <div className="glass-card rounded-3xl p-1.5 shadow-2xl shadow-emerald-950/20 flex items-center justify-between border border-zinc-200/50 dark:border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.highlight) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative -top-5 flex flex-col items-center group focus:outline-none"
                  aria-label={tab.label}
                >
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-4 border-zinc-50 dark:border-zinc-950"
                  >
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </motion.div>
                  <span className="text-[11px] font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex-1 py-1.5 flex flex-col items-center justify-center rounded-2xl transition-all focus:outline-none"
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-indicator"
                    className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.4]'
                        : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-500'
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
