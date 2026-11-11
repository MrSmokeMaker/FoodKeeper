import fs from 'fs';
import path from 'path';

// Template bases for categories
const CUISINES = ['Русская', 'Итальянская', 'Грузинская', 'Азиатская', 'Средиземноморская', 'Мексиканская', 'Французская', 'ПП / Фитнес'];

const BREAKFAST_TEMPLATES = [
  {
    pattern: 'Овсяная каша с {fruit} и {nut}',
    cat: 'breakfast',
    time: 15,
    baseCal: 320, p: 12, f: 8, c: 52,
    ings: [
      { name: 'Овсяные хлопья', amount: 60, unit: 'г', category: 'grocery' },
      { name: 'Молоко 2.5%', amount: 180, unit: 'мл', category: 'dairy' },
      { name: 'Мед цветочный', amount: 15, unit: 'г', category: 'grocery' },
    ],
    varIng1: 'fruit',
    varIng2: 'nut',
    steps: [
      'В сотейнике подогрейте молоко, всыпьте овсяные хлопья.',
      'Варите на медленном огне 5-7 минут, периодически помешивая.',
      'Переложите в тарелку, добавьте нарезанные фрукты и орехи, полейте ложкой меда.'
    ]
  },
  {
    pattern: 'Омлет с {veg} и {cheese}',
    cat: 'breakfast',
    time: 12,
    baseCal: 360, p: 26, f: 24, c: 6,
    ings: [
      { name: 'Яйцо куриное', amount: 3, unit: 'шт', category: 'dairy' },
      { name: 'Молоко 2.5%', amount: 50, unit: 'мл', category: 'dairy' },
      { name: 'Масло сливочное', amount: 10, unit: 'г', category: 'dairy' },
    ],
    varIng1: 'veg',
    varIng2: 'cheese',
    steps: [
      'Взбейте яйца с молоком, солью и щепоткой черного перца.',
      'На разогретой сковороде со сливочным маслом слегка обжарьте овощи (2 минуты).',
      'Залейте яичной смесью, посыпьте сыром и готовьте под крышкой на слабом огне 6-8 минут.'
    ]
  },
  {
    pattern: 'Сырники из творога с {fruit}',
    cat: 'breakfast',
    time: 20,
    baseCal: 380, p: 32, f: 12, c: 38,
    ings: [
      { name: 'Творог 5%', amount: 200, unit: 'г', category: 'dairy' },
      { name: 'Яйцо куриное', amount: 1, unit: 'шт', category: 'dairy' },
      { name: 'Рисовая мука', amount: 30, unit: 'г', category: 'grocery' },
      { name: 'Масло топленое', amount: 10, unit: 'г', category: 'dairy' },
    ],
    varIng1: 'fruit',
    varIng2: 'null',
    steps: [
      'Разомните творог вилкой, добавьте яйцо, рисовую муку и щепотку подсластителя.',
      'Сформируйте аккуратные сырники, обваляйте в муке.',
      'Обжарьте на разогретой сковороде по 3-4 минуты с каждой стороны до золотистой корочки.',
      'Подавайте с нарезанными свежими фруктами или ягодами.'
    ]
  },
  {
    pattern: 'Овсяноблин с начинкой из {meat} и {cheese}',
    cat: 'breakfast',
    time: 15,
    baseCal: 420, p: 34, f: 18, c: 32,
    ings: [
      { name: 'Овсяные хлопья', amount: 50, unit: 'г', category: 'grocery' },
      { name: 'Яйцо куриное', amount: 2, unit: 'шт', category: 'dairy' },
      { name: 'Молоко 2.5%', amount: 30, unit: 'мл', category: 'dairy' },
    ],
    varIng1: 'meat',
    varIng2: 'cheese',
    steps: [
      'Измельчите овсянку, смешайте с яйцами и молоком.',
      'Вылейте на сухую антипригарную сковороду и обжарьте блинчик 3 минуты.',
      'Переверните, выложите на одну половину начинку, накройте второй половиной и прогрейте 2 минуты.'
    ]
  },
  {
    pattern: 'Глазунья с {meat} и хрустящим тостом',
    cat: 'breakfast',
    time: 10,
    baseCal: 390, p: 28, f: 22, c: 20,
    ings: [
      { name: 'Яйцо куриное', amount: 2, unit: 'шт', category: 'dairy' },
      { name: 'Хлеб цельнозерновой', amount: 40, unit: 'г', category: 'bakery' },
      { name: 'Масло оливковое', amount: 8, unit: 'мл', category: 'grocery' },
    ],
    varIng1: 'meat',
    varIng2: 'null',
    steps: [
      'Обжарьте мясной компонент на сковороде 2 минуты.',
      'Разбейте яйца, сохраняя желтки целыми, посолите и поперчите.',
      'Подсушите хлеб в тостере или на сковороде до хруста.',
      'Подавайте яйца со свежей зеленью и горячим тостом.'
    ]
  },
  {
    pattern: 'Шакшука с томатами, {veg} и зеленью',
    cat: 'breakfast',
    time: 18,
    baseCal: 330, p: 20, f: 16, c: 22,
    ings: [
      { name: 'Яйцо куриное', amount: 3, unit: 'шт', category: 'dairy' },
      { name: 'Томаты спелые', amount: 150, unit: 'г', category: 'veg_fruit' },
      { name: 'Томатная паста', amount: 20, unit: 'г', category: 'grocery' },
      { name: 'Чеснок', amount: 5, unit: 'г', category: 'veg_fruit' },
    ],
    varIng1: 'veg',
    varIng2: 'null',
    steps: [
      'Нарежьте томаты и овощи кубиком, обжарьте с чесноком и специями 5 минут до мягкости.',
      'Ложкой сделайте углубления в соусе матбуха и вбейте в них яйца.',
      'Готовьте на умеренном огне 6-8 минут, пока белок не схватится, а желток останется жидким.',
      'Посыпьте свежей кинзой или петрушкой.'
    ]
  },
  {
    pattern: 'Пышные панкейки с {fruit} и сиропом',
    cat: 'breakfast',
    time: 20,
    baseCal: 370, p: 14, f: 10, c: 56,
    ings: [
      { name: 'Мука пшеничная', amount: 70, unit: 'г', category: 'grocery' },
      { name: 'Кефир 2.5%', amount: 120, unit: 'мл', category: 'dairy' },
      { name: 'Яйцо куриное', amount: 1, unit: 'шт', category: 'dairy' },
      { name: 'Разрыхлитель', amount: 3, unit: 'г', category: 'grocery' },
    ],
    varIng1: 'fruit',
    varIng2: 'null',
    steps: [
      'Взбейте яйцо с кефиром, добавьте муку и разрыхлитель до консистенции густой сметаны.',
      'Выпекайте небольшие панкейки на сухой сковороде до пузырьков, затем переверните.',
      'Сложите стопкой, украсьте фруктами и полейте медом или сиропом.'
    ]
  },
  {
    pattern: 'Смузи-боул на основе {fruit} с семенами чиа и {nut}',
    cat: 'breakfast',
    time: 8,
    baseCal: 310, p: 10, f: 11, c: 45,
    ings: [
      { name: 'Банан', amount: 100, unit: 'г', category: 'fruits' },
      { name: 'Йогурт греческий 2%', amount: 120, unit: 'г', category: 'dairy' },
      { name: 'Семена чиа', amount: 10, unit: 'г', category: 'grocery' },
    ],
    varIng1: 'fruit',
    varIng2: 'nut',
    steps: [
      'Взбейте в блендере банан, греческий йогурт и часть фруктов до шелковистой текстуры.',
      'Перелейте густой смузи в глубокую тарелку (боул).',
      'Красиво выложите сверху слайсы фруктов, орехи и посыпьте семенами чиа.'
    ]
  }
];

const LUNCH_TEMPLATES = [
  {
    pattern: 'Суп с {meat}, картофелем и зеленью',
    cat: 'lunch',
    time: 40,
    baseCal: 420, p: 32, f: 14, c: 38,
    ings: [
      { name: 'Картофель', amount: 150, unit: 'г', category: 'veg_fruit' },
      { name: 'Морковь', amount: 60, unit: 'г', category: 'veg_fruit' },
      { name: 'Лук репчатый', amount: 50, unit: 'г', category: 'veg_fruit' },
      { name: 'Зелень свежая', amount: 15, unit: 'г', category: 'veg_fruit' },
    ],
    varIng1: 'meat',
    varIng2: 'null',
    steps: [
      'Отварите мясо до готовности, снимая пену, чтобы бульон остался прозрачным.',
      'Добавьте нарезанный брусочками картофель и пассерованные морковь с луком.',
      'Варите 15 минут до мягкости картофеля.',
      'За пару минут до окончания добавьте лавровый лист и рубленую зелень.'
    ]
  },
  {
    pattern: 'Крем-суп из {veg} со сливками и сухариками',
    cat: 'lunch',
    time: 30,
    baseCal: 350, p: 10, f: 18, c: 36,
    ings: [
      { name: 'Сливки 15%', amount: 80, unit: 'мл', category: 'dairy' },
      { name: 'Сухарики пшеничные', amount: 30, unit: 'г', category: 'bakery' },
      { name: 'Масло сливочное', amount: 15, unit: 'г', category: 'dairy' },
    ],
    varIng1: 'veg',
    varIng2: 'null',
    steps: [
      'Овощи нарежьте кубиками и отварите в подсоленной воде 15-20 минут.',
      'Слейте часть бульона и пюрируйте овощи погружным блендером до гладкости.',
      'Влейте подогретые сливки, сливочное масло, доведите до кипения и снимите с огня.',
      'Подавайте с хрустящими чесночными сухариками.'
    ]
  },
  {
    pattern: 'Паста с {meat} в соусе с {cheese}',
    cat: 'lunch',
    time: 25,
    baseCal: 540, p: 38, f: 18, c: 58,
    ings: [
      { name: 'Паста из твердых сортов', amount: 80, unit: 'г', category: 'grocery' },
      { name: 'Чеснок', amount: 6, unit: 'г', category: 'veg_fruit' },
      { name: 'Масло оливковое', amount: 10, unit: 'мл', category: 'grocery' },
    ],
    varIng1: 'meat',
    varIng2: 'cheese',
    steps: [
      'Отварите пасту в подсоленной воде до состояния al dente.',
      'На оливковом масле обжарьте чеснок и нарезанное мясо до золотистого цвета.',
      'Соедините пасту с мясом, добавьте пару ложек воды от варки пасты и тертый сыр.',
      'Тщательно перемешайте до образования эмульсионного кремового соуса.'
    ]
  },
  {
    pattern: 'Гречка с {meat} и {veg}',
    cat: 'lunch',
    time: 30,
    baseCal: 460, p: 36, f: 14, c: 48,
    ings: [
      { name: 'Гречневая крупа', amount: 70, unit: 'г', category: 'grocery' },
      { name: 'Лук репчатый', amount: 60, unit: 'г', category: 'veg_fruit' },
      { name: 'Масло растительное', amount: 10, unit: 'мл', category: 'grocery' },
    ],
    varIng1: 'meat',
    varIng2: 'veg',
    steps: [
      'Промойте гречку и отварите в воде в пропорции 1:2 в течение 18 минут.',
      'На сковороде обжарьте лук, мясо и овощи до аппетитной корочки.',
      'Соедините горячую рассыпчатую гречку с мясом и овощами, томите под крышкой 5 минут.'
    ]
  },
  {
    pattern: 'Рис с {fish} и {veg}',
    cat: 'lunch',
    time: 25,
    baseCal: 480, p: 34, f: 12, c: 56,
    ings: [
      { name: 'Рис басмати', amount: 70, unit: 'г', category: 'grocery' },
      { name: 'Соевый соус', amount: 15, unit: 'мл', category: 'spices' },
      { name: 'Масло кунжутное', amount: 6, unit: 'мл', category: 'grocery' },
    ],
    varIng1: 'fish',
    varIng2: 'veg',
    steps: [
      'Отварите рис басмати до рассыпчатости.',
      'В воке на сильном огне быстро обжарьте рыбу/морепродукты и овощи (4 минуты).',
      'Добавьте рис, влейте соевый соус и кунжутное масло, обжаривайте вместе еще 2 минуты.'
    ]
  },
  {
    pattern: 'Плов с {meat} и ароматными специями',
    cat: 'lunch',
    time: 50,
    baseCal: 560, p: 34, f: 22, c: 58,
    ings: [
      { name: 'Рис длиннозерный', amount: 80, unit: 'г', category: 'grocery' },
      { name: 'Морковь соломкой', amount: 100, unit: 'г', category: 'veg_fruit' },
      { name: 'Лук репчатый', amount: 80, unit: 'г', category: 'veg_fruit' },
      { name: 'Зира и барбарис', amount: 5, unit: 'г', category: 'spices' },
      { name: 'Масло растительное', amount: 20, unit: 'мл', category: 'grocery' },
    ],
    varIng1: 'meat',
    varIng2: 'null',
    steps: [
      'В казане разогрейте масло, обжарьте мясо до темной корочки.',
      'Добавьте лук и морковь, обжарьте до карамелизации (зирвак).',
      'Залейте водой со специями, томите 20 минут.',
      'Засыпьте промытый рис ровным слоем, готовьте до впитывания воды, затем закройте крышкой на 15 минут.'
    ]
  }
];

const DINNER_TEMPLATES = [
  {
    pattern: 'Запеченное {fish} с {veg} и травами',
    cat: 'dinner',
    time: 30,
    baseCal: 380, p: 38, f: 14, c: 18,
    ings: [
      { name: 'Лимонный сок', amount: 15, unit: 'мл', category: 'fruits' },
      { name: 'Масло оливковое', amount: 10, unit: 'мл', category: 'grocery' },
      { name: 'Розмарин и тимьян', amount: 4, unit: 'г', category: 'spices' },
    ],
    varIng1: 'fish',
    varIng2: 'veg',
    steps: [
      'Выложите рыбу и нарезанные овощи на противень, застеленный пергаментом.',
      'Сбрызните оливковым маслом, лимонным соком, посыпьте прованскими травами и солью.',
      'Запекайте в разогретой до 190°C духовке 20-25 минут.'
    ]
  },
  {
    pattern: 'Стейк из {meat} с гарниром из {veg}',
    cat: 'dinner',
    time: 25,
    baseCal: 460, p: 44, f: 20, c: 16,
    ings: [
      { name: 'Масло сливочное', amount: 10, unit: 'г', category: 'dairy' },
      { name: 'Чеснок', amount: 5, unit: 'г', category: 'veg_fruit' },
      { name: 'Перец черный свежемолотый', amount: 3, unit: 'г', category: 'spices' },
    ],
    varIng1: 'meat',
    varIng2: 'veg',
    steps: [
      'Обсушите стейк салфеткой, натрите солью и свежемолотым перцем.',
      'Разогрейте сковороду до дымка, обжаривайте стейк по 3-4 минуты с каждой стороны с веточкой розмарина и чесноком.',
      'Дайте мясу «отдохнуть» на теплой тарелке 5 минут.',
      'Овощи обжарьте на той же сковороде или подавайте свежими.'
    ]
  },
  {
    pattern: 'Теплый салат с {meat}, {veg} и {cheese}',
    cat: 'dinner',
    time: 20,
    baseCal: 360, p: 32, f: 16, c: 14,
    ings: [
      { name: 'Микс листьев салата', amount: 80, unit: 'г', category: 'veg_fruit' },
      { name: 'Томаты черри', amount: 80, unit: 'г', category: 'veg_fruit' },
      { name: 'Оливковое масло Extra Virgin', amount: 10, unit: 'мл', category: 'grocery' },
      { name: 'Бальзамический крем', amount: 8, unit: 'мл', category: 'spices' },
    ],
    varIng1: 'meat',
    varIng2: 'cheese',
    steps: [
      'На плоское блюдо выложите свежий салатный микс и половинки черри.',
      'На горячей сковороде быстро обжарьте мясо со специями до румяности (5-7 минут).',
      'Выложите теплое мясо прямо на зелень, добавьте кусочки сыра.',
      'Заправьте оливковым маслом и каплями бальзамического крема.'
    ]
  },
  {
    pattern: 'Котлеты из {meat} с пюре из {veg}',
    cat: 'dinner',
    time: 35,
    baseCal: 410, p: 36, f: 18, c: 22,
    ings: [
      { name: 'Яйцо куриное', amount: 1, unit: 'шт', category: 'dairy' },
      { name: 'Лук репчатый', amount: 40, unit: 'г', category: 'veg_fruit' },
      { name: 'Масло сливочное', amount: 10, unit: 'г', category: 'dairy' },
    ],
    varIng1: 'meat',
    varIng2: 'veg',
    steps: [
      'Измельчите мясо с луком, добавьте яйцо, соль и специи, хорошо вымесите фарш.',
      'Сформируйте котлеты и обжарьте на сковороде по 4 минуты, затем доведите под крышкой 8 минут.',
      'Овощи отварите и пюрируйте со сливочным маслом.',
      'Подавайте сочные котлеты на подушке из нежного овощного пюре.'
    ]
  }
];

const SNACK_TEMPLATES = [
  {
    pattern: 'Творожный мусс с {fruit} и {nut}',
    cat: 'snack',
    time: 8,
    baseCal: 240, p: 22, f: 8, c: 20,
    ings: [
      { name: 'Творог мягкий 5%', amount: 150, unit: 'г', category: 'dairy' },
      { name: 'Ваниль или корица', amount: 2, unit: 'г', category: 'spices' },
    ],
    varIng1: 'fruit',
    varIng2: 'nut',
    steps: [
      'Взбейте мягкий творог с щепоткой ванили до воздушного состояния.',
      'Выложите в креманку слоями с нарезанными фруктами.',
      'Сверху посыпьте измельченными орешками.'
    ]
  },
  {
    pattern: 'Брускетта с {cheese}, {veg} и зеленью',
    cat: 'snack',
    time: 10,
    baseCal: 260, p: 12, f: 14, c: 22,
    ings: [
      { name: 'Чиабатта или багет', amount: 50, unit: 'г', category: 'bakery' },
      { name: 'Масло оливковое', amount: 6, unit: 'мл', category: 'grocery' },
      { name: 'Чеснок зубчик', amount: 3, unit: 'г', category: 'veg_fruit' },
    ],
    varIng1: 'cheese',
    varIng2: 'veg',
    steps: [
      'Ломтики хлеба подсушите на сухой сковороде до хруста, натрите с одной стороны зубчиком чеснока.',
      'Сбрызните оливковым маслом, намажьте сыром.',
      'Сверху выложите мелко нарезанные овощи и украсьте листиками базилика.'
    ]
  },
  {
    pattern: 'Салат свежий с {veg}, {cheese} и семечками',
    cat: 'snack',
    time: 10,
    baseCal: 220, p: 10, f: 14, c: 12,
    ings: [
      { name: 'Огурец свежий', amount: 100, unit: 'г', category: 'veg_fruit' },
      { name: 'Масло оливковое', amount: 10, unit: 'мл', category: 'grocery' },
      { name: 'Семена тыквенные', amount: 10, unit: 'г', category: 'nuts' },
    ],
    varIng1: 'veg',
    varIng2: 'cheese',
    steps: [
      'Нарежьте огурцы и другие овощи аккуратными ломтиками.',
      'Добавьте кубики сыра и семена.',
      'Заправьте оливковым маслом, солью и аккуратно перемешайте.'
    ]
  },
  {
    pattern: 'Ролл в лаваше с {meat}, {cheese} и овощами',
    cat: 'snack',
    time: 12,
    baseCal: 320, p: 24, f: 12, c: 28,
    ings: [
      { name: 'Лаваш тонкий армянский', amount: 50, unit: 'г', category: 'bakery' },
      { name: 'Листья салата', amount: 30, unit: 'г', category: 'veg_fruit' },
      { name: 'Томат свежий', amount: 50, unit: 'г', category: 'veg_fruit' },
    ],
    varIng1: 'meat',
    varIng2: 'cheese',
    steps: [
      'Расстелите лист лаваша, выложите листья салата и кружочки томата.',
      'Добавьте ломтики мяса и тертый сыр.',
      'Сверните плотный ролл и подрумяньте на сухой сковороде-гриль по 1.5 минуты с каждой стороны.'
    ]
  }
];

// Variable dictionaries
const VAR_FRUITS = [
  { name: 'Свежая клубника', amount: 70, unit: 'г', category: 'fruits', title: 'клубникой', cal: 25 },
  { name: 'Банан спелый', amount: 80, unit: 'г', category: 'fruits', title: 'бананом', cal: 70 },
  { name: 'Зеленое яблоко', amount: 90, unit: 'г', category: 'fruits', title: 'яблоком', cal: 45 },
  { name: 'Лесная черника', amount: 60, unit: 'г', category: 'fruits', title: 'черникой', cal: 30 },
  { name: 'Малина свежая', amount: 60, unit: 'г', category: 'fruits', title: 'малиной', cal: 28 },
  { name: 'Спелая груша', amount: 90, unit: 'г', category: 'fruits', title: 'грушей', cal: 48 },
  { name: 'Манго сочное', amount: 70, unit: 'г', category: 'fruits', title: 'манго', cal: 45 },
  { name: 'Киви', amount: 70, unit: 'г', category: 'fruits', title: 'киви', cal: 40 },
  { name: 'Персик спелый', amount: 80, unit: 'г', category: 'fruits', title: 'персиком', cal: 35 },
  { name: 'Свежая вишня', amount: 70, unit: 'г', category: 'fruits', title: 'вишней', cal: 38 },
];

const VAR_NUTS = [
  { name: 'Миндаль обжаренный', amount: 20, unit: 'г', category: 'nuts', title: 'миндалем', cal: 120 },
  { name: 'Грецкий орех', amount: 20, unit: 'г', category: 'nuts', title: 'грецким орехом', cal: 130 },
  { name: 'Фундук дробленый', amount: 20, unit: 'г', category: 'nuts', title: 'фундуком', cal: 125 },
  { name: 'Орехи кешью', amount: 20, unit: 'г', category: 'nuts', title: 'кешью', cal: 115 },
  { name: 'Семена льна', amount: 15, unit: 'г', category: 'grocery', title: 'семенами льна', cal: 80 },
  { name: 'Кедровые орешки', amount: 15, unit: 'г', category: 'nuts', title: 'кедровыми орешками', cal: 100 },
];

const VAR_VEGS = [
  { name: 'Томаты черри', amount: 80, unit: 'г', category: 'veg_fruit', title: 'томатами черри', cal: 15 },
  { name: 'Шпинат свежий', amount: 50, unit: 'г', category: 'veg_fruit', title: 'молодым шпинатом', cal: 12 },
  { name: 'Шампиньоны свежие', amount: 100, unit: 'г', category: 'veg_fruit', title: 'шампиньонами', cal: 22 },
  { name: 'Сладкий перец', amount: 80, unit: 'г', category: 'veg_fruit', title: 'болгарским перцем', cal: 20 },
  { name: 'Брокколи соцветия', amount: 100, unit: 'г', category: 'veg_fruit', title: 'брокколи', cal: 30 },
  { name: 'Кабачок молодой', amount: 120, unit: 'г', category: 'veg_fruit', title: 'цукини', cal: 20 },
  { name: 'Цветная капуста', amount: 100, unit: 'г', category: 'veg_fruit', title: 'цветной капустой', cal: 25 },
  { name: 'Стручковая фасоль', amount: 90, unit: 'г', category: 'veg_fruit', title: 'стручковой фасолью', cal: 28 },
  { name: 'Баклажаны ломтиками', amount: 100, unit: 'г', category: 'veg_fruit', title: 'баклажанами', cal: 24 },
  { name: 'Спаржа зеленая', amount: 80, unit: 'г', category: 'veg_fruit', title: 'зеленой спаржей', cal: 18 },
];

const VAR_CHEESES = [
  { name: 'Сыр Моцарелла', amount: 40, unit: 'г', category: 'dairy', title: 'моцареллой', cal: 110 },
  { name: 'Сыр Пармезан', amount: 25, unit: 'г', category: 'dairy', title: 'пармезаном', cal: 100 },
  { name: 'Сыр Сулугуни', amount: 40, unit: 'г', category: 'dairy', title: 'сулугуни', cal: 115 },
  { name: 'Сыр Фета', amount: 35, unit: 'г', category: 'dairy', title: 'фетой', cal: 95 },
  { name: 'Творожный сыр', amount: 40, unit: 'г', category: 'dairy', title: 'творожным сыром', cal: 105 },
  { name: 'Сыр Чеддер', amount: 35, unit: 'г', category: 'dairy', title: 'чеддером', cal: 140 },
  { name: 'Сыр Рикотта', amount: 50, unit: 'г', category: 'dairy', title: 'рикоттой', cal: 85 },
];

const VAR_MEATS = [
  { name: 'Куриное филе', amount: 160, unit: 'г', category: 'meat', title: 'куриным филе', cal: 180 },
  { name: 'Филе индейки', amount: 160, unit: 'г', category: 'meat', title: 'филе индейки', cal: 175 },
  { name: 'Говяжья вырезка', amount: 150, unit: 'г', category: 'meat', title: 'нежной говядиной', cal: 210 },
  { name: 'Фарш из индейки', amount: 150, unit: 'г', category: 'meat', title: 'фаршем из индейки', cal: 190 },
  { name: 'Ветчина нежирная', amount: 60, unit: 'г', category: 'meat', title: 'ветчиной', cal: 90 },
  { name: 'Свиная вырезка нежирная', amount: 150, unit: 'г', category: 'meat', title: 'свиной вырезкой', cal: 200 },
  { name: 'Телятина отварная', amount: 140, unit: 'г', category: 'meat', title: 'телятиной', cal: 185 },
];

const VAR_FISH = [
  { name: 'Филе лосося', amount: 150, unit: 'г', category: 'fish', title: 'атлантическим лососем', cal: 210 },
  { name: 'Тигровые креветки', amount: 140, unit: 'г', category: 'fish', title: 'тигровыми креветками', cal: 130 },
  { name: 'Филе трески', amount: 170, unit: 'г', category: 'fish', title: 'северной треской', cal: 140 },
  { name: 'Филе судака', amount: 160, unit: 'г', category: 'fish', title: 'судаком', cal: 135 },
  { name: 'Тунец в с/с', amount: 130, unit: 'г', category: 'fish', title: 'тунецом', cal: 140 },
  { name: 'Кальмар очищенный', amount: 150, unit: 'г', category: 'fish', title: 'нежным кальмаром', cal: 130 },
  { name: 'Филе дорадо', amount: 160, unit: 'г', category: 'fish', title: 'дорадо', cal: 155 },
];

function getVarList(type) {
  switch (type) {
    case 'fruit': return VAR_FRUITS;
    case 'nut': return VAR_NUTS;
    case 'veg': return VAR_VEGS;
    case 'cheese': return VAR_CHEESES;
    case 'meat': return VAR_MEATS;
    case 'fish': return VAR_FISH;
    default: return [null];
  }
}

export function generate1000Recipes() {
  const result = [];
  const seenTitles = new Set();

  const groups = [
    { templates: BREAKFAST_TEMPLATES, target: 250, defaultCat: 'breakfast' },
    { templates: LUNCH_TEMPLATES, target: 250, defaultCat: 'lunch' },
    { templates: DINNER_TEMPLATES, target: 250, defaultCat: 'dinner' },
    { templates: SNACK_TEMPLATES, target: 250, defaultCat: 'snack' },
  ];

  let idCounter = 1;

  for (const group of groups) {
    let generatedInGroup = 0;
    let tIndex = 0;

    while (generatedInGroup < group.target) {
      const template = group.templates[tIndex % group.templates.length];
      tIndex++;

      const list1 = getVarList(template.varIng1);
      const list2 = getVarList(template.varIng2);

      const item1 = list1[Math.floor(Math.random() * list1.length)];
      const item2 = list2[Math.floor(Math.random() * list2.length)];

      let title = template.pattern;
      if (item1) title = title.replace(`{${template.varIng1}}`, item1.title || item1.name);
      if (item2) title = title.replace(`{${template.varIng2}}`, item2.title || item2.name);

      // Add variation prefix/suffix if title collision
      if (seenTitles.has(title)) {
        const adjectives = ['По-домашнему', 'Шеф-версия', 'Фитнес', 'С травами', 'Праздничный', 'Классический', 'Нежный', 'Пряный'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        title = `${adj}: ${title}`;
      }

      if (seenTitles.has(title)) {
        title = `${title} (${generatedInGroup + 1})`;
      }

      seenTitles.add(title);

      const ingredients = [...template.ings];
      let addCal = 0;

      if (item1 && item1.name) {
        ingredients.push({
          name: item1.name,
          amount: item1.amount,
          unit: item1.unit,
          category: item1.category
        });
        addCal += item1.cal || 0;
      }

      if (item2 && item2.name) {
        ingredients.push({
          name: item2.name,
          amount: item2.amount,
          unit: item2.unit,
          category: item2.category
        });
        addCal += item2.cal || 0;
      }

      const totalCalories = template.baseCal + addCal;
      const protein = Math.round(template.p + (addCal * 0.04));
      const fat = Math.round(template.f + (addCal * 0.03));
      const carbs = Math.round(template.c + (addCal * 0.05));

      const cuisine = CUISINES[Math.floor(Math.random() * CUISINES.length)];

      result.push({
        id: idCounter++,
        title,
        description: `Сбалансированное блюдо (${cuisine.toLowerCase()} кухня), богатое белком и полезными микроэлементами. Готовится за ${template.time} минут.`,
        prepTimeMinutes: template.time,
        servings: 1,
        calories: totalCalories,
        protein,
        fat,
        carbs,
        ingredients,
        instructions: template.steps,
        category: template.cat,
        cuisine,
        isFavorite: false,
        importedFromWeb: false,
        tags: ['Здоровое питание', cuisine, template.cat === 'breakfast' ? 'Завтрак' : 'КБЖУ'],
        createdAt: '2026-11-11'
      });

      generatedInGroup++;
    }
  }

  return result;
}

// Write to public/data/recipes.json
const outputDir = path.resolve('public', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const recipes = generate1000Recipes();
const outputPath = path.join(outputDir, 'recipes.json');
fs.writeFileSync(outputPath, JSON.stringify(recipes, null, 2), 'utf8');

console.log(`✅ Успешно сгенерировано ${recipes.length} рецептов в ${outputPath}`);
