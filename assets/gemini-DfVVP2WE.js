const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-DSE_x0fo.js","./index-DJZFb3sM.css"])))=>i.map(i=>d[i]);
import{t as e}from"./index-DSE_x0fo.js";async function t(t){try{let n=await e(()=>import(`./index-DSE_x0fo.js`).then(e=>e.i),__vite__mapDeps([0,1]),import.meta.url);(n.default||n)(t)}catch(e){console.debug(`Confetti animation skipped`,e)}}var n=`https://pqeicvohoegcczvdxtiz.supabase.co/functions/v1/gemini-proxy`;function r(e){return e.replace(/^```json\s*/i,``).replace(/^```\s*/i,``).replace(/```\s*$/i,``).trim()}function i(e){return e?.trim()||``}async function a(e,t,a){let o=i(t.apiKey),{proxyUrl:s}=t;if(!o)throw Error(`API ключ Gemini не настроен в приложении.`);let c=`${s?.trim()?s.trim().replace(/\/+$/,``):n}/v1beta/models/gemini-3.5-flash:generateContent?key=${o}`,l=[{text:e}];if(a){let e=a.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);e&&l.unshift({inlineData:{mimeType:e[1],data:e[2]}})}let u=await fetch(c,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{role:`user`,parts:l}],generationConfig:{temperature:.3,responseMimeType:`application/json`}})});if(!u.ok){let e=await u.text(),t=e;try{t=JSON.parse(e).error?.message||e}catch{}throw t.includes(`User location is not supported`)||t.includes(`User location is not supported`)?Error(`Региональное ограничение Google (User location is not supported). Включите VPN или укажите URL прокси в Настройках приложения.`):Error(`Ошибка Gemini API (${u.status}): ${t}`)}let d=(await u.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!d)throw Error(`Модель вернула пустой ответ`);return r(d)}async function o(e,t){let n=i(t.apiKey);if(!n)throw Error(`API-ключ Gemini не настроен. Укажите ключ в Настройках для распознавания фото или заполните данные продукта вручную.`);let r=await a(`
Ты профессиональный нутрициолог и OCR-сканер этикеток продуктов. Проанализируй фото этикетки, чека или упаковки товара.
ОБЯЗАТЕЛЬНО извлеки точный вес/объем, пищевую ценность (КБЖУ), категорию продукта и срок годности.

Верни СТРОГО валидный JSON:
{
  "name": "Название продукта (русский язык)",
  "category": "Название категории на русском (например: Молочные продукты, Мясо и птица, Рыба и морепродукты, Овощи и зелень, Фрукты и ягоды, Крупы и макароны, Хлеб и выпечка, Специи и соусы, Орехи и сухофрукты, Напитки, Снеки)",
  "quantity": число (общий вес или объем нетто всей упаковки, например 200, 450, 1000),
  "unit": "одна из: г, кг, мл, л, шт",
  "calories": число (ккал строго на 100г продукта, округли до целого),
  "protein": число (белки на 100г, 1 знак после запятой),
  "fat": число (жиры на 100г, 1 знак после запятой),
  "carbs": число (углеводы на 100г, 1 знак после запятой),
  "explicitExpiryDate": "ГГГГ-ММ-ДД если на фото видна точная дата окончания срока, иначе null",
  "daysUntilExpiry": число (ориентировочный срок годности в днях с текущего момента, например 5, 14, 30, 90)
}
Если какой-то параметр частично затёрт на фото, определи его по средним табличным значениям для данного типа продукта.
`,{...t,apiKey:n},e),o=JSON.parse(r),s=o.explicitExpiryDate&&/^\d{4}-\d{2}-\d{2}$/.test(o.explicitExpiryDate)?o.explicitExpiryDate:new Date(Date.now()+(Number(o.daysUntilExpiry)||7)*864e5).toISOString().split(`T`)[0];return{name:o.name,category:o.category||`other`,quantity:Number(o.quantity)||100,unit:o.unit||`г`,calories:Number(o.calories)||0,protein:Number(o.protein)||0,fat:Number(o.fat)||0,carbs:Number(o.carbs)||0,expiryDate:s}}async function s(e,t){let n=i(t.apiKey);if(!n)throw Error(`API-ключ Gemini не настроен. Укажите ключ в Настройках для импорта рецептов через ИИ.`);let r=await a(`
Ты шеф-повар и профессиональный нутрициолог. Пользователь предоставил ссылку или текст рецепта:
"${e}"

Проанализируй рецепт. В рецепте ОБЯЗАТЕЛЬНО должны быть точные числовые граммовки для каждого ингредиента!
Никаких "по вкусу" без граммов — если специи, укажи "2 г", если яйцо, укажи "1 шт (55 г)".

Сформируй СТРОГО валидный JSON:
{
  "title": "Аппетитное название рецепта на русском",
  "description": "Краткое описание пользы и вкуса (1-2 предложения)",
  "prepTimeMinutes": число (время приготовления в минутах),
  "servings": число порций (например 1 или 2),
  "calories": число (ккал СТРОГО НА ОДНУ ПОРЦИЮ),
  "protein": число (белки на порцию, г),
  "fat": число (жиры на порцию, г),
  "carbs": число (углеводы на порцию, г),
  "category": "одна из: breakfast, lunch, snack, dinner",
  "ingredients": [
    {
      "name": "Название ингредиента",
      "amount": число (точная граммовка/число, например 180, 50, 15, 2),
      "unit": "г / мл / шт / ч.л. / ст.л.",
      "category": "Название категории на русском (например: Молочные продукты, Мясо и птица, Рыба и морепродукты, Овощи и зелень, Фрукты и ягоды, Крупы и макароны, Специи и соусы, Орехи и сухофрукты, Хлеб и выпечка, Другое)"
    }
  ],
  "instructions": [
    "Пошаговый шаг 1 с указанием граммовок",
    "Шаг 2",
    "Шаг 3"
  ]
}
`,{...t,apiKey:n}),o=JSON.parse(r);return{title:o.title,description:o.description||``,prepTimeMinutes:Number(o.prepTimeMinutes)||20,servings:Number(o.servings)||1,calories:Number(o.calories)||400,protein:Number(o.protein)||20,fat:Number(o.fat)||12,carbs:Number(o.carbs)||40,category:o.category||`lunch`,importedFromWeb:!0,sourceUrl:e.startsWith(`http`)?e:void 0,ingredients:(o.ingredients||[]).map(e=>({name:e.name,amount:Number(e.amount)||50,unit:e.unit||`г`,category:e.category||`other`})),instructions:o.instructions||[]}}export{s as n,t as r,o as t};