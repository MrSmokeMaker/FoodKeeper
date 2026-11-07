import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${iconSize} shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 p-0.5 shadow-md shadow-emerald-600/25 flex items-center justify-center transition-transform hover:scale-105`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
        >
          <defs>
            <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="doorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e6fcf5" />
            </linearGradient>
          </defs>

          {/* Корпус холодильника */}
          <rect x="12" y="6" width="24" height="36" rx="6" fill="url(#doorGrad)" />
          {/* Линия разделения камер */}
          <line x1="12" y1="20" x2="36" y2="20" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" />
          {/* Ручки холодильника */}
          <rect x="15" y="11" width="2" height="5" rx="1" fill="#047857" />
          <rect x="15" y="24" width="2" height="7" rx="1" fill="#047857" />

          {/* Лист свежести / Экологичности */}
          <path
            d="M30 15C34 11 38 12 38 12C38 12 39 16 35 20C31 24 30 15 30 15Z"
            fill="url(#leafGrad)"
          />

          {/* Искорка ИИ */}
          <path
            d="M38 7L39.5 10L42.5 11.5L39.5 13L38 16L36.5 13L33.5 11.5L36.5 10L38 7Z"
            fill="#fef08a"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`${textSize} font-black tracking-tight text-zinc-900 dark:text-zinc-50`}>
              Food<span className="text-emerald-500 dark:text-emerald-400">Keeper</span>
            </span>
          </div>
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase mt-0.5">
            Smart Nutrition AI
          </span>
        </div>
      )}
    </div>
  );
};
