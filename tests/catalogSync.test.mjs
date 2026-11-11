import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('public/data/recipes.json contains at least 1000 well-formed recipes', () => {
  const filePath = path.resolve('public', 'data', 'recipes.json');
  assert.ok(fs.existsSync(filePath), 'recipes.json must exist in public/data');

  const content = fs.readFileSync(filePath, 'utf8');
  const recipes = JSON.parse(content);

  assert.ok(Array.isArray(recipes), 'Catalog must be an array');
  assert.ok(recipes.length >= 1000, `Catalog must contain >= 1000 recipes, got ${recipes.length}`);

  const validCategories = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

  for (let i = 0; i < Math.min(recipes.length, 100); i++) {
    const r = recipes[i];
    assert.ok(typeof r.title === 'string' && r.title.length > 3, `Recipe ${i} must have a valid title`);
    assert.ok(validCategories.has(r.category), `Recipe ${i} category must be valid, got ${r.category}`);
    assert.ok(typeof r.calories === 'number' && r.calories > 0, `Recipe ${i} calories must be positive`);
    assert.ok(typeof r.protein === 'number' && r.protein >= 0, `Recipe ${i} protein must be valid`);
    assert.ok(typeof r.fat === 'number' && r.fat >= 0, `Recipe ${i} fat must be valid`);
    assert.ok(typeof r.carbs === 'number' && r.carbs >= 0, `Recipe ${i} carbs must be valid`);
    assert.ok(Array.isArray(r.ingredients) && r.ingredients.length > 0, `Recipe ${i} must have ingredients`);

    for (const ing of r.ingredients) {
      assert.ok(typeof ing.name === 'string' && ing.name.length > 0, 'Ingredient must have a name');
      assert.ok(typeof ing.amount === 'number' && ing.amount > 0, 'Ingredient amount must be positive');
      assert.ok(typeof ing.unit === 'string' && ing.unit.length > 0, 'Ingredient unit must be string');
    }
  }
});
