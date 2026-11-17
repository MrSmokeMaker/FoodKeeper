import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signInWithEmail,
  signUpWithEmail,
  resetPasswordForEmail,
  getFriendlyAuthErrorMessage,
} from '../src/services/auth.ts';

test('auth input validations prevent empty calls', async () => {
  const res1 = await signInWithEmail('', '');
  assert.equal(res1.success, false);
  assert.equal(res1.error, 'Заполните email и пароль');

  const res2 = await signUpWithEmail('test@example.com', '123');
  assert.equal(res2.success, false);
  assert.equal(res2.error, 'Пароль должен быть не короче 6 символов');

  const res3 = await resetPasswordForEmail('');
  assert.equal(res3.success, false);
  assert.equal(res3.error, 'Введите email для восстановления');
});

test('Supabase signIn returns friendly error on invalid credentials', async () => {
  const result = await signInWithEmail('non_existent_foodkeeper_user_999@test.com', 'wrongpassword123');
  assert.equal(result.success, false);
  assert.ok(result.error);
  // Должен вернуть понятную русскую ошибку
  assert.ok(
    result.error.includes('Неверный адрес') ||
    result.error.includes('электронной почты') ||
    result.error.includes('Ошибка сети')
  );
});
