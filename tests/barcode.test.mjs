import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQuantityAndUnit,
  mapCategoryFromOpenFoodFacts,
  lookupBarcodeInOpenFoodFacts,
} from '../src/services/barcode.ts';

test('parseQuantityAndUnit correctly parses different units and amounts', () => {
  assert.deepEqual(parseQuantityAndUnit('400 g'), { quantity: 400, unit: 'г' });
  assert.deepEqual(parseQuantityAndUnit('1.5 kg'), { quantity: 1.5, unit: 'кг' });
  assert.deepEqual(parseQuantityAndUnit('500 мл'), { quantity: 500, unit: 'мл' });
  assert.deepEqual(parseQuantityAndUnit('1 л'), { quantity: 1, unit: 'л' });
  assert.deepEqual(parseQuantityAndUnit('6 шт'), { quantity: 6, unit: 'шт' });
  assert.deepEqual(parseQuantityAndUnit(undefined), { quantity: 100, unit: 'г' });
});

test('mapCategoryFromOpenFoodFacts correctly maps Russian and international product tags', () => {
  assert.equal(mapCategoryFromOpenFoodFacts('Творог 5% Простоквашино'), 'dairy');
  assert.equal(mapCategoryFromOpenFoodFacts('Greek Yogurt', ['en:dairies']), 'dairy');
  assert.equal(mapCategoryFromOpenFoodFacts('Филе грудки куриное'), 'meat');
  assert.equal(mapCategoryFromOpenFoodFacts('Батон нарезной коломенский'), 'bakery');
  assert.equal(mapCategoryFromOpenFoodFacts('Сок апельсиновый Rich'), 'drinks');
  assert.equal(mapCategoryFromOpenFoodFacts('Спагетти Barilla No 5'), 'grocery');
  assert.equal(mapCategoryFromOpenFoodFacts('Чипсы Lay\'s с солью'), 'snacks');
  assert.equal(mapCategoryFromOpenFoodFacts('Неизвестный предмет'), 'other');
});

test('lookupBarcodeInOpenFoodFacts parses API response with nutriments and brand', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      assert.ok(String(url).includes('4607004891234'));
      return {
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name_ru: 'Молоко 3.2%',
            brands: 'Домик в деревне, ВБД',
            quantity: '930 мл',
            categories_tags: ['en:dairies', 'en:milks'],
            nutriments: {
              'energy-kcal_100g': 60,
              'proteins_100g': 3.0,
              'fat_100g': 3.2,
              'carbohydrates_100g': 4.7,
            },
          },
        }),
      };
    };

    const res = await lookupBarcodeInOpenFoodFacts('4607004891234');
    assert.ok(res !== null);
    assert.equal(res.name, 'Молоко 3.2% Домик в деревне');
    assert.equal(res.category, 'dairy');
    assert.equal(res.quantity, 930);
    assert.equal(res.unit, 'мл');
    assert.equal(res.calories, 60);
    assert.equal(res.protein, 3.0);
    assert.equal(res.fat, 3.2);
    assert.equal(res.carbs, 4.7);
    assert.equal(res.source, 'openfoodfacts');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('lookupBarcodeInOpenFoodFacts returns null on network failure or not found', async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Network failure
    globalThis.fetch = async () => {
      throw new Error('Network error');
    };
    const resFail = await lookupBarcodeInOpenFoodFacts('4600000000000');
    assert.equal(resFail, null);

    // Product not found in database (status 0)
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ status: 0 }),
    });
    const resNotFound = await lookupBarcodeInOpenFoodFacts('4600000000000');
    assert.equal(resNotFound, null);

    // Short barcode (< 6 digits)
    const resShort = await lookupBarcodeInOpenFoodFacts('123');
    assert.equal(resShort, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
