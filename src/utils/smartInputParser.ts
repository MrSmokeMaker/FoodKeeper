export interface ParsedProductInput {
  name: string;
  quantity: number;
  unit: 'г' | 'кг' | 'мл' | 'л' | 'шт';
  expiryDays: number;
}

/**
 * Парсит строку естественного ввода на русском языке.
 * Примеры:
 * - "Молоко 3 дня" -> name: "Молоко", expiryDays: 3, quantity: 1, unit: "шт"
 * - "Творог 200г 5 дн" -> name: "Творог", quantity: 200, unit: "г", expiryDays: 5
 * - "Бананы 1.5 кг 4 дня" -> name: "Бананы", quantity: 1.5, unit: "кг", expiryDays: 4
 * - "Хлеб завтра" -> name: "Хлеб", quantity: 1, unit: "шт", expiryDays: 1
 * - "Сок 1л 10 дней" -> name: "Сок", quantity: 1, unit: "л", expiryDays: 10
 */
export function parseProductSmartInput(input: string): ParsedProductInput {
  let text = input.trim();
  let expiryDays = 7;
  let quantity = 1;
  let unit: 'г' | 'кг' | 'мл' | 'л' | 'шт' = 'шт';

  if (!text) {
    return { name: '', quantity, unit, expiryDays };
  }

  // 1. Поиск ключевых слов срока: "завтра", "сегодня", "на неделю"
  if (/(?:^|\s)завтра(?:\s|$)/i.test(text)) {
    expiryDays = 1;
    text = text.replace(/(?:^|\s)завтра(?:\s|$)/gi, ' ');
  } else if (/(?:^|\s)сегодня(?:\s|$)/i.test(text)) {
    expiryDays = 0;
    text = text.replace(/(?:^|\s)сегодня(?:\s|$)/gi, ' ');
  } else if (/(?:^|\s)(?:на\s+)?недел[яиею](?:\s|$)/i.test(text)) {
    expiryDays = 7;
    text = text.replace(/(?:^|\s)(?:на\s+)?недел[яиею](?:\s|$)/gi, ' ');
  } else {
    // Поиск числа дней: "3 дн", "5 дней", "на 2 дня", "4 день"
    const daysMatch = text.match(/(?:^|\s)(?:на\s+)?(\d+)\s*(?:дн|дней|дня|день)(?:\s|$)/i);
    if (daysMatch) {
      expiryDays = parseInt(daysMatch[1], 10);
      text = text.replace(daysMatch[0], ' ');
    }
  }

  // 2. Поиск количества и единиц измерения: "200г", "200 гр", "1.5 кг", "2 шт", "1 л", "500 мл"
  const qtyMatch = text.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(кг|кило|г|гр|грамм|грамма|граммов|мл|миллилитров|л|литр|литра|литров|шт|штук|штуки)(?:\s|$)/i);
  if (qtyMatch) {
    const val = parseFloat(qtyMatch[1].replace(',', '.'));
    const rawUnit = qtyMatch[2].toLowerCase();

    if (rawUnit.startsWith('кг') || rawUnit.startsWith('кило')) {
      quantity = val;
      unit = 'кг';
    } else if (rawUnit.startsWith('мл')) {
      quantity = val;
      unit = 'мл';
    } else if (rawUnit.startsWith('л')) {
      quantity = val;
      unit = 'л';
    } else if (rawUnit.startsWith('г')) {
      quantity = val;
      unit = 'г';
    } else {
      quantity = val;
      unit = 'шт';
    }
    text = text.replace(qtyMatch[0], ' ');
  }

  // Очистка названия: убираем висящие предлоги и знаки препинания
  let cleanedName = text
    .replace(/(?:^|\s)на(?:\s|$)/gi, ' ')
    .replace(/[,\-;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const name = cleanedName || input.trim();

  return {
    name,
    quantity,
    unit,
    expiryDays,
  };
}
