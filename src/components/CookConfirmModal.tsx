import React, { useState } from 'react';
import { Utensils, X, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import type { Recipe, Product } from '../types';
import { calculateDeductions, type DeductionItem, type MissingIngredientItem } from '../services/inventory';

interface CookConfirmModalProps {
  recipe: Recipe;
  pantry: Product[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDeductions: DeductionItem[], missingToAdd: MissingIngredientItem[]) => Promise<void>;
}

export const CookConfirmModal: React.FC<CookConfirmModalProps> = ({
  recipe,
  pantry,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const result = calculateDeductions(recipe.ingredients || [], pantry);
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    result.deductions.forEach((d) => {
      init[d.productId] = true;
    });
    return init;
  });
  const [autoAddMissing, setAutoAddMissing] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const filteredDeductions = result.deductions.filter((d) => selectedIds[d.productId]);
      const missingToProcess = autoAddMissing ? result.missing : [];
      await onConfirm(filteredDeductions, missingToProcess);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col max-h-[90vh]">
        {/* Шапка */}
        <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Списание продуктов
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">
                {recipe.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Список ингредиентов */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 text-xs">
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
            Проверьте продукты, которые будут списаны из холодильника:
          </p>

          {result.deductions.length > 0 && (
            <div className="space-y-2">
              {result.deductions.map((item) => {
                const isChecked = selectedIds[item.productId] ?? true;
                const willDeplete = item.remainingQuantity <= 0;

                return (
                  <div
                    key={item.productId}
                    onClick={() => toggleSelect(item.productId)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-zinc-400'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          В наличии: {item.originalQuantity} {item.unit} → Останется:{' '}
                          <span className={willDeplete ? 'text-amber-500 font-bold' : 'text-emerald-500'}>
                            {item.remainingQuantity} {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg">
                      -{item.deductedQuantity} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Отсутствующие ингредиенты */}
          {result.missing.length > 0 && (
            <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Не найдено в холодильнике ({result.missing.length}):</span>
              </div>
              <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                {result.missing.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>• {m.name}</span>
                    <span className="font-semibold text-zinc-500">{m.amount} {m.unit}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 pt-1 border-t border-amber-500/15 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAddMissing}
                  onChange={(e) => setAutoAddMissing(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" /> Добавить недостающее в список покупок
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="p-4 border-t border-zinc-100 dark:border-white/5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
          >
            Отмена
          </button>
          <button
            onClick={handleApply}
            disabled={loading}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Подтвердить списание</span>
          </button>
        </div>
      </div>
    </div>
  );
};
