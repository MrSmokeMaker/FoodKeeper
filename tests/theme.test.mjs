import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitialTheme, applyThemeToDocument } from '../src/services/theme.ts';

// Setup environment mocks
function setupMockEnv({ storedTheme = null, prefersDark = false } = {}) {
  const storage = new Map();
  if (storedTheme) {
    storage.set('theme', storedTheme);
  }

  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };

  globalThis.window = {
    matchMedia: (query) => ({
      matches: query.includes('dark') ? prefersDark : !prefersDark,
    }),
  };

  const classListSet = new Set();
  globalThis.document = {
    documentElement: {
      classList: {
        add: (cls) => classListSet.add(cls),
        remove: (cls) => classListSet.delete(cls),
        contains: (cls) => classListSet.has(cls),
      },
    },
  };

  return { storage, classListSet };
}

test('getInitialTheme prioritizes localStorage when valid theme is set', () => {
  setupMockEnv({ storedTheme: 'dark', prefersDark: false });
  assert.equal(getInitialTheme('light'), 'dark');

  setupMockEnv({ storedTheme: 'light', prefersDark: true });
  assert.equal(getInitialTheme('dark'), 'light');
});

test('getInitialTheme falls back to Telegram colorScheme when localStorage is empty', () => {
  setupMockEnv({ storedTheme: null, prefersDark: false });
  assert.equal(getInitialTheme('dark'), 'dark');

  setupMockEnv({ storedTheme: null, prefersDark: true });
  assert.equal(getInitialTheme('light'), 'light');
});

test('getInitialTheme falls back to matchMedia when localStorage and Telegram are unset', () => {
  setupMockEnv({ storedTheme: null, prefersDark: true });
  assert.equal(getInitialTheme(undefined), 'dark');

  setupMockEnv({ storedTheme: null, prefersDark: false });
  assert.equal(getInitialTheme(undefined), 'light');
});

test('applyThemeToDocument updates document classes and saves to localStorage', () => {
  const { storage, classListSet } = setupMockEnv();

  applyThemeToDocument('dark');
  assert.equal(classListSet.has('dark'), true);
  assert.equal(classListSet.has('light'), false);
  assert.equal(storage.get('theme'), 'dark');

  applyThemeToDocument('light');
  assert.equal(classListSet.has('light'), true);
  assert.equal(classListSet.has('dark'), false);
  assert.equal(storage.get('theme'), 'light');
});
