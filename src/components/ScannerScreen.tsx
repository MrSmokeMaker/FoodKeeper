import { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Check, RefreshCw, AlertCircle, Barcode, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Product, ProductCategory, UserProfile } from '../types';
import { parseProductLabel } from '../services/gemini';
import { triggerHaptic } from '../services/telegram';

interface ScannerScreenProps {
  profile: UserProfile;
  onAddProduct: (product: Omit<Product, 'id' | 'addedAt'>) => Promise<void>;
  onNavigateToFridge: () => void;
  onOpenPaywall: () => void;
  onIncrementScanCount: () => Promise<void>;
}

export const ScannerScreen = ({
  profile,
  onAddProduct,
  onNavigateToFridge,
  onOpenPaywall,
  onIncrementScanCount,
}: ScannerScreenProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<string | null>(null);

  // Распознанные поля
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('dairy');
  const [quantity, setQuantity] = useState(150);
  const [unit, setUnit] = useState<'г' | 'кг' | 'мл' | 'л' | 'шт'>('г');
  const [calories, setCalories] = useState(70);
  const [protein, setProtein] = useState(8);
  const [fat, setFat] = useState(2);
  const [carbs, setCarbs] = useState(4);
  const [expiryDate, setExpiryDate] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPro = profile.subscriptionTier === 'pro';
  const scansLeft = Math.max(0, 3 - (profile.dailyScansUsed || 0));

  // Определение штрихкода через Web BarcodeDetector API (если поддерживается браузером)
  const tryDetectBarcode = async (imgElement: HTMLImageElement) => {
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
        });
        const barcodes = await barcodeDetector.detect(imgElement);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          setBarcodeResult(code);
          triggerHaptic('light');
        }
      } catch (e) {
        console.warn('BarcodeDetector not active on this image', e);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка лимитов для Free-тарифа
    if (!isPro && scansLeft <= 0) {
      triggerHaptic('medium');
      onOpenPaywall();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImage(base64);

      // Пробуем распознать штрихкод параллельно
      const img = new Image();
      img.src = base64;
      img.onload = () => tryDetectBarcode(img);

      runVisionAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const runVisionAnalysis = async (base64: string) => {
    setLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const result = await parseProductLabel(base64, {
        proxyUrl: profile.geminiProxyUrl,
      });

      if (result.name) setName(result.name);
      if (result.category) setCategory(result.category);
      if (result.quantity) setQuantity(result.quantity);
      if (result.unit) setUnit(result.unit);
      if (result.calories !== undefined) setCalories(result.calories);
      if (result.protein !== undefined) setProtein(result.protein);
      if (result.fat !== undefined) setFat(result.fat);
      if (result.carbs !== undefined) setCarbs(result.carbs);
      if (result.expiryDate) setExpiryDate(result.expiryDate);

      await onIncrementScanCount();
      triggerHaptic('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка распознавания этикетки.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToFridge = async () => {
    if (!name.trim()) return;

    await onAddProduct({
      name: name.trim(),
      category,
      quantity,
      unit,
      calories,
      protein,
      fat,
      carbs,
      barcode: barcodeResult || undefined,
      expiryDate: expiryDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    });

    setIsSuccess(true);
    triggerHaptic('success');
    setTimeout(() => {
      onNavigateToFridge();
    }, 1000);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" /> Гибридный сканер
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Распознавание штрихкодов и таблиц КБЖУ через ИИ
          </p>
        </div>

        {/* Статус лимита сканов */}
        {isPro ? (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Zap className="w-3 h-3 fill-amber-500" /> Безлимит PRO
          </span>
        ) : (
          <button
            onClick={onOpenPaywall}
            className="text-[11px] font-bold px-2 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 flex items-center gap-1"
          >
            <span>Осталось сканов: {scansLeft} / 3</span>
          </button>
        )}
      </div>

      {/* Зона загрузки фото / превью */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 min-h-[220px] flex flex-col items-center justify-center p-4">
        {image ? (
          <div className="relative w-full flex flex-col items-center">
            <img
              src={image}
              alt="Скан этикетки"
              className="max-h-56 rounded-2xl object-contain shadow-md"
            />
            {barcodeResult && (
              <div className="mt-2 px-2.5 py-1 bg-zinc-900 text-emerald-400 rounded-lg text-[11px] font-mono flex items-center gap-1.5 shadow-md border border-emerald-500/30">
                <Barcode className="w-3.5 h-3.5" /> Штрихкод: {barcodeResult}
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-white space-y-2">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-semibold">ИИ анализирует состав и КБЖУ...</span>
                <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Переснять
              </button>
              <button
                onClick={() => runVisionAnalysis(image)}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" /> Повторить анализ
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Сделайте снимок этикетки или штрихкода
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                ИИ автоматически извлечет пищевую ценность на 100г
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Upload className="w-4 h-4" /> Сканировать камерой
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2 text-rose-500 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Форма подтверждения распознанных данных */}
      {(image || name) && (
        <div className="glass-card rounded-3xl p-4 space-y-3 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Распознанные параметры
            </span>
            <span className="text-[10px] text-zinc-400">Проверьте перед сохранением</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-zinc-500 block mb-1">Название продукта</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-500 block mb-1">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0"
                >
                  <option value="dairy">Молочка</option>
                  <option value="meat">Мясо</option>
                  <option value="fish">Рыба</option>
                  <option value="veg_fruit">Овощи/Фрукты</option>
                  <option value="grocery">Бакалея</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-500 block mb-1">Вес / объём</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 font-semibold"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0"
                  >
                    <option value="г">г</option>
                    <option value="кг">кг</option>
                    <option value="мл">мл</option>
                    <option value="л">л</option>
                    <option value="шт">шт</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Ккал/100г</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-black text-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Белки</label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-black text-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Жиры</label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value))}
                  className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-black text-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block text-center">Углев</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-black text-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-500 block mb-1">Срок годности (до)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0"
              />
            </div>
          </div>

          <button
            onClick={handleSaveToFridge}
            disabled={isSuccess || !name}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-3 active:scale-95"
          >
            {isSuccess ? (
              <>
                <Check className="w-5 h-5 text-white animate-bounce" />
                <span>Добавлено в холодильник!</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Сохранить в «Холодильник»</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
