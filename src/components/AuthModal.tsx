import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { UserProfile } from '../types';
import {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  resetPasswordForEmail,
  setGuestMode,
} from '../services/auth';
import { triggerHaptic, isTelegramWebApp, initTelegramApp } from '../services/telegram';
import { db } from '../db';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserProfile;
}

type AuthMode = 'signin' | 'signup' | 'reset';

export const AuthModal = ({ isOpen, onClose, profile }: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAuthorized = Boolean(profile?.authUserId);
  const isTg = isTelegramWebApp();
  const tgData = isTg ? initTelegramApp() : null;

  const resetState = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    triggerHaptic('light');
    resetState();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signInWithEmail(email, password);
        if (!res.success) {
          setError(res.error || 'Ошибка входа');
          triggerHaptic('heavy');
        } else {
          triggerHaptic('success');
          setSuccessMessage('Вы успешно вошли в аккаунт!');
          setTimeout(() => {
            onClose();
          }, 600);
        }
      } else if (mode === 'signup') {
        const res = await signUpWithEmail(email, password, name);
        if (!res.success) {
          setError(res.error || 'Ошибка регистрации');
          triggerHaptic('heavy');
        } else {
          triggerHaptic('success');
          if (res.isConfirmationNeeded) {
            setSuccessMessage(
              'Регистрация успешна! На вашу почту отправлена ссылка для подтверждения.'
            );
          } else {
            setSuccessMessage('Аккаунт успешно создан!');
            setTimeout(() => {
              onClose();
            }, 600);
          }
        }
      } else if (mode === 'reset') {
        const res = await resetPasswordForEmail(email);
        if (!res.success) {
          setError(res.error || 'Не удалось отправить ссылку');
          triggerHaptic('heavy');
        } else {
          triggerHaptic('success');
          setSuccessMessage('Ссылка для сброса пароля отправлена на ваш email!');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Непредвиденная ошибка');
      triggerHaptic('heavy');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    triggerHaptic('medium');
    setLoading(true);
    await signOutUser();
    setLoading(false);
    setSuccessMessage('Вы вышли из аккаунта');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleContinueAsGuest = async () => {
    triggerHaptic('light');
    await setGuestMode(profile);
    onClose();
  };

  const handleSyncTelegram = async () => {
    if (!tgData?.user || !profile) return;
    triggerHaptic('success');
    await db.userProfile.update(profile.id!, {
      name: tgData.user.name,
      telegramId: tgData.user.id,
      telegramUsername: tgData.user.username,
      authProvider: 'telegram',
    });
    setSuccessMessage(`Профиль привязан к Telegram (${tgData.user.name})`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6"
      >
        {/* Кнопка закрытия */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {isAuthorized ? (
          /* Экран авторизованного профиля */
          <div className="flex flex-col items-center text-center space-y-4 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {profile?.name || 'Личный профиль'}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {profile?.email || 'Авторизованный пользователь'}
              </p>
            </div>

            <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-left text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-400">Тариф:</span>
                <span className="font-semibold text-emerald-500 uppercase">
                  {profile?.subscriptionTier || 'Free'}
                </span>
              </div>
              {profile?.telegramUsername && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Telegram:</span>
                  <span className="font-medium text-blue-500">@{profile.telegramUsername}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400">Синхронизация:</span>
                <span className="text-emerald-500 font-medium">Активна (Cloud + Local)</span>
              </div>
            </div>

            {successMessage && (
              <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Выйти из аккаунта</span>
            </button>
          </div>
        ) : (
          /* Форма авторизации / регистрации / сброса */
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {mode === 'signin' && 'Вход в FoodKeeper'}
                {mode === 'signup' && 'Регистрация'}
                {mode === 'reset' && 'Восстановление пароля'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {mode === 'signin' && 'Синхронизируйте продукты и рацион между устройствами'}
                {mode === 'signup' && 'Создайте профиль для сохранения истории и доступа к ИИ'}
                {mode === 'reset' && 'Мы отправим ссылку для восстановления на ваш email'}
              </p>
            </div>

            {/* Переключатель режимов Вход / Регистрация */}
            {mode !== 'reset' && (
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signin')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signup')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Регистрация
                </button>
              </div>
            )}

            {/* Telegram быстрая связка */}
            {isTg && tgData?.user && mode !== 'reset' && (
              <button
                type="button"
                onClick={handleSyncTelegram}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Войти как {tgData.user.name}</span>
              </button>
            )}

            {/* Сообщения об ошибках / успехе */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Имя
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ваше имя"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      Пароль
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('reset')}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Забыли пароль?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'signin' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Войти</span>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Зарегистрироваться</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Отправить ссылку для сброса</span>
                  </>
                )}
              </button>
            </form>

            {mode === 'reset' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signin')}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
                >
                  Вернуться ко входу
                </button>
              </div>
            )}

            {/* Кнопка "Продолжить без входа" (Гостевой режим) */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-colors"
              >
                Продолжить без аккаунта (Офлайн-режим)
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
