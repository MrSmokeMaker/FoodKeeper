import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateWeeklyMealPlanFromCatalog,
  getRandomAlternativeRecipe,
  getRandomRecipeFromList,
  filterRecipesByPreferences,
  scoreRecipeForExpiringProducts,
} from '../src/services/mealPlanGenerator.ts';

const mockRecipes = [
  { id: 1, title: 'Сырники из творога', category: 'breakfast', calories: 350, protein: 30, fat: 10, carbs: 30, ingredients: [] },
  { id: 2, title: 'Овсяная каша с ягодами', category: 'breakfast', calories: 300, protein: 12, fat: 6, carbs: 50, ingredients: [] },
  { id: 3, title: 'Борщ с говядиной', category: 'lunch', calories: 450, protein: 35, fat: 15, carbs: 40, ingredients: [] },
  { id: 4, title: 'Паста с индейкой', category: 'lunch', calories: 520, protein: 38, fat: 16, carbs: 55, ingredients: [] },
  { id: 5, title: 'Творожный мусс', category: 'snack', calories: 220, protein: 20, fat: 6, carbs: 18, ingredients: [] },
  { id: 6, title: 'Стейк из лосося с брокколи', category: 'dinner', calories: 420, protein: 40, fat: 20, carbs: 12, ingredients: [] },
  { id: 7, title: 'Куриное филе на гриле', category: 'dinner', calories: 380, protein: 45, fat: 12, carbs: 8, ingredients: [] },
];

test('generateWeeklyMealPlanFromCatalog generates 28 meals across 7 days', () => {
  const plan = generateWeeklyMealPlanFromCatalog(mockRecipes, '2026-11-11');
  assert.equal(plan.length, 28, '7 days * 4 meals = 28 items');

  const days = new Set(plan.map((m) => m.date));
  assert.equal(days.size, 7, 'Must span exactly 7 unique calendar dates');

  for (const date of days) {
    const dayMeals = plan.filter((m) => m.date === date);
    assert.equal(dayMeals.length, 4);

    const mealTypes = dayMeals.map((m) => m.mealType);
    assert.ok(mealTypes.includes('breakfast'));
    assert.ok(mealTypes.includes('lunch'));
    assert.ok(mealTypes.includes('snack'));
    assert.ok(mealTypes.includes('dinner'));
  }
});

test('getRandomAlternativeRecipe picks different recipe of matching category', () => {
  const alt = getRandomAlternativeRecipe(mockRecipes, 'breakfast', 1);
  assert.ok(alt !== null);
  assert.equal(alt.category, 'breakfast');
  assert.equal(alt.id, 2, 'Should pick the other breakfast (id 2) instead of excluded id 1');
});

test('getRandomAlternativeRecipe prioritizes pantry products when priority is pantry', () => {
  const recipesWithIngs = [
    {
      id: 1,
      title: 'Омлет с сыром',
      category: 'breakfast',
      calories: 300,
      protein: 20,
      fat: 15,
      carbs: 5,
      ingredients: [{ name: 'Яйца куриные', amount: 3, unit: 'шт' }],
    },
    {
      id: 2,
      title: 'Сырники из рикотты',
      category: 'breakfast',
      calories: 350,
      protein: 25,
      fat: 10,
      carbs: 20,
      ingredients: [{ name: 'Рикотта', amount: 200, unit: 'г' }],
    },
  ];

  const pantry = [
    { id: 101, name: 'Яйца куриные С0', category: 'eggs', quantity: 10, unit: 'шт' },
  ];

  const alt = getRandomAlternativeRecipe(recipesWithIngs, 'breakfast', undefined, 'pantry', pantry);
  assert.ok(alt !== null);
  assert.equal(alt.id, 1, 'Should pick recipe with eggs present in pantry');
});

test('generateWeeklyMealPlanFromCatalog preserves locked meal items', () => {
  const existingPlan = [
    {
      date: '2026-11-11',
      mealType: 'breakfast',
      title: 'Фирменный завтрак шефа',
      recipeId: 999,
      calories: 500,
      protein: 30,
      fat: 20,
      carbs: 40,
      completed: false,
      isLocked: true,
    },
  ];

  const plan = generateWeeklyMealPlanFromCatalog(
    mockRecipes,
    '2026-11-11',
    'any',
    [],
    existingPlan
  );

  const preservedBreakfast = plan.find(
    (m) => m.date === '2026-11-11' && m.mealType === 'breakfast'
  );
  assert.ok(preservedBreakfast);
  assert.equal(preservedBreakfast.title, 'Фирменный завтрак шефа');
  assert.equal(preservedBreakfast.isLocked, true);
  assert.equal(plan.length, 28);
});

test('filterRecipesByPreferences filters out allergens and respects diet', () => {
  const testRecipes = [
    {
      id: 1,
      title: 'Салат с тунцом',
      category: 'lunch',
      calories: 300,
      protein: 25,
      fat: 10,
      carbs: 5,
      ingredients: [{ name: 'Тунец консервированный', amount: 100, unit: 'г' }],
    },
    {
      id: 2,
      title: 'Овсяная каша на воде',
      category: 'breakfast',
      calories: 250,
      protein: 10,
      fat: 5,
      carbs: 45,
      ingredients: [{ name: 'Овсяные хлопья', amount: 60, unit: 'г' }],
    },
    {
      id: 3,
      title: 'Стейк говяжий',
      category: 'dinner',
      calories: 450,
      protein: 40,
      fat: 20,
      carbs: 0,
      ingredients: [{ name: 'Говядина вырезка', amount: 200, unit: 'г' }],
    },
  ];

  // Test allergen filtering: exclude fish
  const withoutFish = filterRecipesByPreferences(testRecipes, 'none', ['тунец']);
  assert.equal(withoutFish.length, 2);
  assert.ok(!withoutFish.some((r) => r.title.includes('тунцом')));

  // Test vegetarian diet
  const vegOnly = filterRecipesByPreferences(testRecipes, 'vegetarian', []);
  assert.equal(vegOnly.length, 1);
  assert.equal(vegOnly[0].title, 'Овсяная каша на воде');
});

test('scoreRecipeForExpiringProducts awards points for matching expiring food', () => {
  const recipe = {
    id: 1,
    title: 'Омлет с помидорами',
    category: 'breakfast',
    calories: 250,
    protein: 15,
    fat: 12,
    carbs: 6,
    ingredients: [
      { name: 'Яйца', amount: 2, unit: 'шт' },
      { name: 'Томаты свежие', amount: 100, unit: 'г' },
    ],
  };

  const expiring = [
    { id: 10, name: 'Томаты', category: 'vegetables', quantity: 200, unit: 'г' },
  ];

  const score = scoreRecipeForExpiringProducts(recipe, expiring);
  assert.ok(score > 0, 'Score should be positive when expiring ingredient matches');
});

test('getRandomRecipeFromList handles empty and edge cases', () => {
  assert.equal(getRandomRecipeFromList([]), null);
  const single = [{ id: 10, title: 'Один рецепт', category: 'lunch' }];
  assert.equal(getRandomRecipeFromList(single, 10).id, 10, 'Fallback to list if all are excluded');
});
