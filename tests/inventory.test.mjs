import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUnit,
  convertUnitAmount,
  cleanProductName,
  parseIngredientsFromTitle,
  findMatchingPantryProduct,
  calculateDeductions,
  calculateSmartShoppingList,
} from '../src/services/inventory.ts';

test('normalizeUnit correctly standardizes various unit spellings', () => {
  assert.equal(normalizeUnit('гр'), 'г');
  assert.equal(normalizeUnit('грамм'), 'г');
  assert.equal(normalizeUnit('кг.'), 'кг');
  assert.equal(normalizeUnit('миллилитров'), 'мл');
  assert.equal(normalizeUnit('л'), 'л');
  assert.equal(normalizeUnit('штук'), 'шт');
});

test('convertUnitAmount correctly converts weight and volume', () => {
  assert.equal(convertUnitAmount(1, 'кг', 'г'), 1000);
  assert.equal(convertUnitAmount(250, 'г', 'кг'), 0.25);
  assert.equal(convertUnitAmount(0.5, 'л', 'мл'), 500);
  assert.equal(convertUnitAmount(100, 'мл', 'л'), 0.1);
  assert.equal(convertUnitAmount(2, 'ст.л.', 'мл'), 30);
  assert.equal(convertUnitAmount(1, 'шт', 'г'), null); // incompatible
});

test('cleanProductName strips noise words and punctuation', () => {
  assert.equal(cleanProductName('Свежий шпинат «Мини»'), 'шпинат мини');
  assert.equal(cleanProductName('Куриное филе охлажденное'), 'куриное филе');
  assert.equal(cleanProductName('Спелый авокадо Хасс'), 'авокадо хасс');
});

test('parseIngredientsFromTitle extracts items with amounts and units', () => {
  const title = 'Куриное филе (180г) с рисом басмати (60г) и свежими томатами (100г)';
  const ings = parseIngredientsFromTitle(title);
  assert.equal(ings.length, 3);
  assert.equal(ings[0].name, 'Куриное филе');
  assert.equal(ings[0].amount, 180);
  assert.equal(ings[0].unit, 'г');
  assert.equal(ings[1].name, 'рисом басмати');
  assert.equal(ings[1].amount, 60);
  assert.equal(ings[2].amount, 100);
});

test('findMatchingPantryProduct finds product by substring and tokens', () => {
  const pantry = [
    { id: 1, name: 'Куриное филе охлажденное', category: 'meat', quantity: 800, unit: 'г', calories: 110, protein: 23, fat: 1, carbs: 0, addedAt: '2026-11-07' },
    { id: 2, name: 'Творог 5% классический', category: 'dairy', quantity: 400, unit: 'г', calories: 120, protein: 16, fat: 5, carbs: 3, addedAt: '2026-11-07' },
  ];

  const match1 = findMatchingPantryProduct('Куриное филе', pantry);
  assert.ok(match1);
  assert.equal(match1.id, 1);

  const match2 = findMatchingPantryProduct('Творог', pantry);
  assert.ok(match2);
  assert.equal(match2.id, 2);

  const match3 = findMatchingPantryProduct('Лосось', pantry);
  assert.equal(match3, undefined);
});

test('calculateDeductions handles conversions and identifies missing ingredients', () => {
  const pantry = [
    { id: 1, name: 'Куриное филе охлажденное', category: 'meat', quantity: 1, unit: 'кг', calories: 110, protein: 23, fat: 1, carbs: 0, addedAt: '2026-11-07' },
    { id: 2, name: 'Свежий шпинат', category: 'veg_fruit', quantity: 50, unit: 'г', calories: 20, protein: 2, fat: 0, carbs: 3, addedAt: '2026-11-07' },
  ];

  const recipeIngredients = [
    { name: 'Куриное филе', amount: 250, unit: 'г' }, // Needs conversion from g to kg
    { name: 'Шпинат', amount: 50, unit: 'г' },        // Exactly finishes the item
    { name: 'Авокадо', amount: 1, unit: 'шт' },        // Missing
  ];

  const result = calculateDeductions(recipeIngredients, pantry);

  assert.equal(result.deductions.length, 2);
  // Deduction 1: 1 kg - 0.25 kg = 0.75 kg
  assert.equal(result.deductions[0].productId, 1);
  assert.equal(result.deductions[0].originalQuantity, 1);
  assert.equal(result.deductions[0].deductedQuantity, 0.25);
  assert.equal(result.deductions[0].remainingQuantity, 0.75);

  // Deduction 2: 50 g - 50 g = 0
  assert.equal(result.deductions[1].productId, 2);
  assert.equal(result.deductions[1].remainingQuantity, 0);

  // Missing: Avocado
  assert.equal(result.missing.length, 1);
  assert.equal(result.missing[0].name, 'Авокадо');
});

test('calculateSmartShoppingList accurately computes deficit', () => {
  const pantry = [
    { id: 1, name: 'Куриное филе', category: 'meat', quantity: 500, unit: 'г', calories: 110, protein: 23, fat: 1, carbs: 0, addedAt: '2026-11-07' },
  ];

  const meals = [
    {
      date: '2026-11-07',
      mealType: 'lunch',
      title: 'Куриное филе (300г)',
      calories: 400,
      protein: 30,
      fat: 5,
      carbs: 10,
      completed: false,
    },
    {
      date: '2026-11-08',
      mealType: 'dinner',
      title: 'Куриное филе (400г)',
      calories: 500,
      protein: 40,
      fat: 6,
      carbs: 10,
      completed: false,
    },
    {
      date: '2026-11-08',
      mealType: 'breakfast',
      title: 'Яйца (3 шт)',
      calories: 200,
      protein: 15,
      fat: 10,
      carbs: 1,
      completed: false,
    },
  ];

  const shopping = calculateSmartShoppingList(meals, pantry);

  // Chicken needed: 300 + 400 = 700g. In pantry: 500g. Deficit: 200g.
  const chicken = shopping.find((s) => cleanProductName(s.name) === cleanProductName('Куриное филе'));
  assert.ok(chicken);
  assert.equal(chicken.amount, 200);
  assert.equal(chicken.checked, false);

  // Eggs needed: 3 шт. In pantry: 0. Deficit: 3 шт.
  const eggs = shopping.find((s) => cleanProductName(s.name) === cleanProductName('Яйца'));
  assert.ok(eggs);
  assert.equal(eggs.amount, 3);
  assert.equal(eggs.checked, false);
});
