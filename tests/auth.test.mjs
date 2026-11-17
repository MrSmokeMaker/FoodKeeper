import test from 'node:test';
import assert from 'node:assert/strict';
import { getFriendlyAuthErrorMessage } from '../src/services/auth.ts';

test('getFriendlyAuthErrorMessage handles various Supabase auth errors correctly', () => {
  // Invalid credentials
  const err1 = { message: 'Invalid login credentials' };
  assert.equal(getFriendlyAuthErrorMessage(err1), 'Неверный адрес электронной почты или пароль.');

  // User already exists
  const err2 = { message: 'User already registered' };
  assert.equal(
    getFriendlyAuthErrorMessage(err2),
    'Пользователь с такой почтой уже зарегистрирован. Попробуйте войти.'
  );

  // Password too short
  const err3 = { message: 'Password should be at least 6 characters' };
  assert.equal(getFriendlyAuthErrorMessage(err3), 'Пароль должен содержать не менее 6 символов.');

  // Email not confirmed
  const err4 = { message: 'Email not confirmed' };
  assert.equal(
    getFriendlyAuthErrorMessage(err4),
    'Адрес электронной почты еще не подтвержден. Проверьте ваш почтовый ящик.'
  );

  // Network / Fetch error
  const err5 = { message: 'Failed to fetch' };
  assert.equal(
    getFriendlyAuthErrorMessage(err5),
    'Ошибка сети. Проверьте интернет-соединение или повторите попытку позже.'
  );

  // Unknown fallback
  const err6 = { message: 'Custom unexpected database error' };
  assert.equal(getFriendlyAuthErrorMessage(err6), 'Custom unexpected database error');
});
