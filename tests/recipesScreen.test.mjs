// tests/recipesScreen.test.mjs
import { test, expect } from 'vitest';
import { db } from '../src/db';
import { normalizeUnit, cleanProductName, findMatchingPantryProduct, calculateDeductions } from '../src/services/inventory';
import type { Product, Recipe } from '../src/types';

// Helper to reset DB for each test
async function resetDB() {
  await db.recipes.clear();
  await db.products.clear();
  await db.recipes.bulkAdd([
    {
      id: 1,
      title: 'Курица с рисом',
      imageUrl: '',
      ingredients: [
        { name: 'Куриное филе', amount: 200, unit: 'г' },
        { name: 'Рис басмати', amount: 100, unit: 'г' },
      ],
      steps: [],
      calories: 500,
      protein: 30,
      fat: 10,
      carbs: 60,
      rating: 5,
      sourceUrl: '',
      category: 'dinner',
      isFavorite: false,
      importedFromWeb: false,
      createdAt: new Date().toISOString(),
    },
  ]);
  await db.products.bulkAdd([
    { id: 1, name: 'Куриное филе', category: 'meat', quantity: 300, unit: 'г', expiryDate: null, calories: 165, protein: 31, fat: 4, carbs: 0, addedAt: new Date().toISOString().split('T')[0] },
    { id: 2, name: 'Рис басмати', category: 'grocery', quantity: 200, unit: 'г', expiryDate: null, calories: 130, protein: 3, fat: 0, carbs: 28, addedAt: new Date().toISOString().split('T')[0] },
  ]);
}

test('search filter returns correct recipes', async () => {
  await resetDB();
  const all = await db.recipes.toArray();
  const query = 'курица';
  const filtered = all.filter(r => r.title.toLowerCase().includes(query));
  expect(filtered.length).toBe(1);
  expect(filtered[0].title).toBe('Курица с рисом');
});

test('favorite toggle updates recipe', async () => {
  await resetDB();
  const recipe = await db.recipes.get(1);
  expect(recipe?.isFavorite).toBe(false);
  await db.recipes.update(1, { isFavorite: true });
  const updated = await db.recipes.get(1);
  expect(updated?.isFavorite).toBe(true);
});

test('deductions calculate correctly', async () => {
  await resetDB();
  const recipe = await db.recipes.get(1);
  const pantry = await db.products.toArray();
  const result = calculateDeductions(recipe!.ingredients, pantry);
  // Should deduct 200г курицы leaving 100г, and 100г риса leaving 100г
  const chickenDeduction = result.deductions.find(d => d.productName.includes('Куриное филе'))!;
  const riceDeduction = result.deductions.find(d => d.productName.includes('Рис'))!;
  expect(chickenDeduction.deductedQuantity).toBe(200);
  expect(chickenDeduction.remainingQuantity).toBe(100);
  expect(riceDeduction.deductedQuantity).toBe(100);
  expect(riceDeduction.remainingQuantity).toBe(100);
  expect(result.missing.length).toBe(0);
});
