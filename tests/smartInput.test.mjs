import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProductSmartInput } from '../src/utils/smartInputParser.ts';

test('parseProductSmartInput parses simple name', () => {
  const result = parseProductSmartInput('Яблоки');
  assert.equal(result.name, 'Яблоки');
  assert.equal(result.quantity, 1);
  assert.equal(result.unit, 'шт');
  assert.equal(result.expiryDays, 7);
});

test('parseProductSmartInput parses name and days', () => {
  const result = parseProductSmartInput('Молоко 3 дня');
  assert.equal(result.name, 'Молоко');
  assert.equal(result.expiryDays, 3);
  assert.equal(result.quantity, 1);
  assert.equal(result.unit, 'шт');
});

test('parseProductSmartInput parses tomorrow keyword', () => {
  const result = parseProductSmartInput('Хлеб завтра');
  assert.equal(result.name, 'Хлеб');
  assert.equal(result.expiryDays, 1);
});

test('parseProductSmartInput parses weight and days', () => {
  const result = parseProductSmartInput('Творог 200г 5 дн');
  assert.equal(result.name, 'Творог');
  assert.equal(result.quantity, 200);
  assert.equal(result.unit, 'г');
  assert.equal(result.expiryDays, 5);
});

test('parseProductSmartInput parses decimal kg and volume liters', () => {
  const result1 = parseProductSmartInput('Бананы 1.5 кг 4 дня');
  assert.equal(result1.name, 'Бананы');
  assert.equal(result1.quantity, 1.5);
  assert.equal(result1.unit, 'кг');
  assert.equal(result1.expiryDays, 4);

  const result2 = parseProductSmartInput('Сок 1л 10 дней');
  assert.equal(result2.name, 'Сок');
  assert.equal(result2.quantity, 1);
  assert.equal(result2.unit, 'л');
  assert.equal(result2.expiryDays, 10);
});

test('parseProductSmartInput handles percent in product name', () => {
  const result = parseProductSmartInput('Творог 5% 200г 3 дня');
  assert.equal(result.name, 'Творог 5%');
  assert.equal(result.quantity, 200);
  assert.equal(result.unit, 'г');
  assert.equal(result.expiryDays, 3);
});

test('parseProductSmartInput handles today keyword', () => {
  const result = parseProductSmartInput('Рыба сегодня');
  assert.equal(result.name, 'Рыба');
  assert.equal(result.expiryDays, 0);
});
