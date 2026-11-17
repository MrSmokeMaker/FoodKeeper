import { createClient, type User, type Session } from '@supabase/supabase-js';
import { db } from '../db';
import type { UserProfile } from '../types';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string)?.trim() ||
  'https://pqeicvohoegcczvdxtiz.supabase.co';

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZWljdm9ob2VnY2N6dmR4dGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NzcwNzEsImV4cCI6MjEwODQ1MzA3MX0.AdWUoo1Qmzf0G40iJM2Frvq4z9PmqiX-d78JmaHrf5M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Человекочитаемый перевод частых ошибок авторизации
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Неизвестная ошибка';
  const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Неверный адрес электронной почты или пароль.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Пользователь с такой почтой уже зарегистрирован. Попробуйте войти.';
  }
  if (msg.includes('password should be at least')) {
    return 'Пароль должен содержать не менее 6 символов.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Адрес электронной почты еще не подтвержден. Проверьте ваш почтовый ящик.';
  }
  if (msg.includes('invalid format') || msg.includes('valid email')) {
    return 'Пожалуйста, введите корректный адрес электронной почты.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Ошибка сети. Проверьте интернет-соединение или повторите попытку позже.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Слишком много попыток. Подождите немного и повторите снова.';
  }

  return error.message || 'Произошла ошибка при аутентификации.';
}

export interface AuthResponseResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
  isConfirmationNeeded?: boolean;
}

/**
 * Регистрация через Email и пароль
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  name?: string
): Promise<AuthResponseResult> {
  const cleanEmail = email.trim();
  const cleanPass = pass.trim();
  const cleanName = name?.trim() || cleanEmail.split('@')[0];

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Заполните email и пароль' };
  }
  if (cleanPass.length < 6) {
    return { success: false, error: 'Пароль должен быть не короче 6 символов' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPass,
      options: {
        data: {
          name: cleanName,
        },
      },
    });

    if (error) {
      return { success: false, error: getFriendlyAuthErrorMessage(error) };
    }

    if (data.user) {
      await syncUserWithLocalDb(data.user, cleanName);
    }

    const isConfirmationNeeded = Boolean(data.user && !data.session);

    return {
      success: true,
      user: data.user,
      session: data.session,
      isConfirmationNeeded,
    };
  } catch (err: any) {
    return { success: false, error: getFriendlyAuthErrorMessage(err) };
  }
}

/**
 * Вход через Email и пароль
 */
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<AuthResponseResult> {
  const cleanEmail = email.trim();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Заполните email и пароль' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error) {
      return { success: false, error: getFriendlyAuthErrorMessage(error) };
    }

    if (data.user) {
      await syncUserWithLocalDb(data.user);
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (err: any) {
    return { success: false, error: getFriendlyAuthErrorMessage(err) };
  }
}

/**
 * Выход из аккаунта
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: getFriendlyAuthErrorMessage(error) };
    }

    // Сбрасываем статус авторизации в локальном профиле Dexie
    const profile = await db.userProfile.toCollection().first();
    if (profile) {
      await db.userProfile.update(profile.id!, {
        authUserId: undefined,
        authProvider: 'guest',
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: getFriendlyAuthErrorMessage(err) };
  }
}

/**
 * Восстановление пароля (сброс по почте)
 */
export async function resetPasswordForEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return { success: false, error: 'Введите email для восстановления' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });

    if (error) {
      return { success: false, error: getFriendlyAuthErrorMessage(error) };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: getFriendlyAuthErrorMessage(err) };
  }
}

/**
 * Получение текущей активной сессии
 */
export async function getCurrentAuthSession(): Promise<{
  user: User | null;
  session: Session | null;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return { user: null, session: null };
    }
    return { user: data.session.user, session: data.session };
  } catch {
    return { user: null, session: null };
  }
}

/**
 * Синхронизация данных пользователя Supabase с локальным профилем Dexie
 */
export async function syncUserWithLocalDb(user: User, fallbackName?: string): Promise<void> {
  try {
    const existing = await db.userProfile.toCollection().first();
    const displayName =
      (user.user_metadata?.name as string) ||
      (user.user_metadata?.full_name as string) ||
      fallbackName ||
      user.email?.split('@')[0] ||
      existing?.name ||
      'Пользователь';

    if (existing) {
      await db.userProfile.update(existing.id!, {
        name: displayName,
        email: user.email,
        authUserId: user.id,
        authProvider: 'supabase',
      });
    } else {
      await db.userProfile.add({
        name: displayName,
        email: user.email,
        authUserId: user.id,
        authProvider: 'supabase',
        currentWeight: 75,
        targetWeight: 70,
        targetCalories: 2000,
        targetProtein: 140,
        targetFat: 70,
        targetCarbs: 210,
        geminiProxyUrl: '',
        theme: 'dark',
        subscriptionTier: 'free',
        dailyScansUsed: 0,
        lastScanDate: new Date().toISOString().split('T')[0],
      });
    }
  } catch (e) {
    console.warn('Не удалось синхронизировать профиль с локальной базой:', e);
  }
}

/**
 * Вход в гостевом режиме (для локального офлайн-использования)
 */
export async function setGuestMode(profile?: UserProfile): Promise<void> {
  const current = profile || (await db.userProfile.toCollection().first());
  if (current) {
    await db.userProfile.update(current.id!, {
      authProvider: 'guest',
      authUserId: undefined,
    });
  }
}
