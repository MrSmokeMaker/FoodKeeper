const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-CCaTl5bR.js","./index-DbaiQnvY.css"])))=>i.map(i=>d[i]);
import{t as e}from"./index-CCaTl5bR.js";async function t(t){try{let n=await e(()=>import(`./index-CCaTl5bR.js`).then(e=>e.i),__vite__mapDeps([0,1]),import.meta.url);(n.default||n)(t)}catch(e){console.debug(`Confetti animation skipped`,e)}}var n=`https://pqeicvohoegcczvdxtiz.supabase.co/functions/v1/gemini-proxy`,r=`gemini-3.5-flash`;function i(e){return e.replace(/^```json\s*/i,``).replace(/^```\s*/i,``).replace(/```\s*$/i,``).trim()}function a(e){return e?.trim()||``}async function o(e,t,o){let s=a(t.apiKey),{proxyUrl:c}=t;if(!s)throw Error(`API ключ Gemini не настроен в приложении.`);let l=`${c?.trim()?c.trim().replace(/\/+$/,``):n}/v1beta/models/${r}:generateContent?key=${s}`,u=[{text:e}];if(o){let e=o.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);e&&u.unshift({inlineData:{mimeType:e[1],data:e[2]}})}let d=await fetch(l,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{role:`user`,parts:u}],generationConfig:{temperature:.3,responseMimeType:`application/json`}})});if(!d.ok){let e=await d.text(),t=e;try{t=JSON.parse(e).error?.message||e}catch{}throw t.includes(`User location is not supported`)||t.includes(`User location is not supported`)?Error(`Региональное ограничение Google (User location is not supported). Включите VPN или укажите URL прокси в Настройках приложения.`):Error(`Ошибка Gemini API (${d.status}): ${t}`)}let f=(await d.json()).candidates?.[0]?.content?.parts?.[0]?.text;if(!f)throw Error(`Модель вернула пустой ответ`);return i(f)}async function s(e,t){let n=a(t.apiKey);if(!n)return await new Promise(e=>setTimeout(e,1200)),{name:`Греческий йогурт Teos 2%`,category:`dairy`,quantity:140,unit:`г`,calories:70,protein:8,fat:2,carbs:4.2,expiryDate:new Date(Date.now()+864e6).toISOString().split(`T`)[0]};let r=await o(`
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
`,{...t,apiKey:n},e),i=JSON.parse(r),s=i.explicitExpiryDate&&/^\d{4}-\d{2}-\d{2}$/.test(i.explicitExpiryDate)?i.explicitExpiryDate:new Date(Date.now()+(Number(i.daysUntilExpiry)||7)*864e5).toISOString().split(`T`)[0];return{name:i.name,category:i.category||`other`,quantity:Number(i.quantity)||100,unit:i.unit||`г`,calories:Number(i.calories)||0,protein:Number(i.protein)||0,fat:Number(i.fat)||0,carbs:Number(i.carbs)||0,expiryDate:s}}async function c(e,t){let n=a(t.apiKey);if(!n)return await new Promise(e=>setTimeout(e,1200)),{title:`Паста с лососем и брокколи в нежном сливочном соусе`,description:`Импортировано из открытой кулинарной библиотеки: ресторанное блюдо с балансом Омега-3 и медленных углеводов.`,prepTimeMinutes:25,servings:2,calories:520,protein:34,fat:16,carbs:60,category:`lunch`,importedFromWeb:!0,sourceUrl:e.startsWith(`http`)?e:void 0,ingredients:[{name:`Лосось свежий (филе)`,amount:250,unit:`г`,category:`Рыба и морепродукты`},{name:`Паста из твердых сортов`,amount:150,unit:`г`,category:`Крупы и макароны`},{name:`Брокколи свежая`,amount:150,unit:`г`,category:`Овощи и зелень`},{name:`Сливки 10%`,amount:100,unit:`мл`,category:`Молочные продукты`},{name:`Оливковое масло`,amount:10,unit:`мл`,category:`Специи и соусы`},{name:`Чеснок и морская соль`,amount:5,unit:`г`,category:`Специи и соусы`}],instructions:[`Отварить 150г пасты в подсоленной воде 8 минут до аль денте, за 3 минуты до готовности опустить соцветия брокколи (150г).`,`Филе лосося (250г) нарезать средними кубиками и обжарить на 10мл оливкового масла 3-4 минуты.`,`Влить 100мл сливок 10%, добавить измельченный зубчик чеснока и томить соус 2 минуты до лёгкого загустения.`,`Смешать пасту и брокколи со сливочным соусом и лососем, поперчить и подавать горячим.`]};let r=await o(`
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
`,{...t,apiKey:n}),i=JSON.parse(r);return{title:i.title,description:i.description||``,prepTimeMinutes:Number(i.prepTimeMinutes)||20,servings:Number(i.servings)||1,calories:Number(i.calories)||400,protein:Number(i.protein)||20,fat:Number(i.fat)||12,carbs:Number(i.carbs)||40,category:i.category||`lunch`,importedFromWeb:!0,sourceUrl:e.startsWith(`http`)?e:void 0,ingredients:(i.ingredients||[]).map(e=>({name:e.name,amount:Number(e.amount)||50,unit:e.unit||`г`,category:e.category||`other`})),instructions:i.instructions||[]}}export{c as n,t as r,s as t};