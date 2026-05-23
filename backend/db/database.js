const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'sonyalpha.db');
let db;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
    initSchema();
    seedData();
    saveDb();
  }
  return db;
}

function saveDb() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name_ru TEXT NOT NULL,
      description_ru TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      name_ru TEXT NOT NULL,
      model TEXT NOT NULL,
      description_ru TEXT,
      price INTEGER NOT NULL,
      old_price INTEGER,
      stock INTEGER DEFAULT 0,
      badge TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      specs TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      delivery_address TEXT DEFAULT '',
      delivery_type TEXT DEFAULT 'pickup',
      items TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT DEFAULT 'new',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title_ru TEXT NOT NULL,
      excerpt_ru TEXT,
      body_ru TEXT,
      image TEXT,
      is_published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function run(sql, params) {
  db.run(sql, params);
}

function seedData() {
  // ── Categories ──
  const cats = [
    [1, 'mirrorless', 'Беззеркальные камеры',   'Серия Alpha — полнокадровые камеры для профессионалов', 1],
    [2, 'compact',    'Компактные камеры',        'Маленькие, лёгкие, профессиональные',                  2],
    [3, 'lenses',     'Объективы',                'G Master и Zeiss объективы для любой задачи',           3],
    [4, 'video',      'Видеокамеры',              '4K, slow-motion, cinema качество',                      4],
    [5, 'accessories','Аксессуары',               'Аккумуляторы, сумки, штативы и многое другое',          5],
  ];
  cats.forEach(c =>
    run('INSERT INTO categories (id,slug,name_ru,description_ru,sort_order) VALUES (?,?,?,?,?)',
      [c[0], c[1], c[2], c[3], c[4]])
  );

  // ── Products ──
  const P = (slug, cat, name, model, desc, price, old_price, stock, badge, specs) =>
    run(
      'INSERT INTO products (slug,category_id,name_ru,model,description_ru,price,old_price,stock,badge,specs) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [slug, cat, name, model, desc, price, old_price, stock, badge, JSON.stringify(specs)]
    );

  // Mirrorless
  P('ilce-7c', 1, 'Sony Alpha 7C', 'ILCE-7C',
    'Компактная полнокадровая камера с реальным отслеживанием AF. Идеальна для путешествий.',
    20608000, null, 5, 'top', {
      'Матрица': '35мм полный кадр, 24.2 МП',
      'Стабилизация': '5-осевая IBIS',
      'Видео': '4K 30fps',
      'Автофокус': 'Real-Time Tracking',
      'ISO': '100-51200',
      'Батарея': 'До 680 кадров',
      'Вес': '509г',
      'Крепление': 'Sony E-Mount'
    });

  P('ilce-7sm3', 1, 'Sony Alpha 7S III', 'ILCE-7SM3',
    'Флагман для видеографов. 12.1 МП сенсор с феноменальной светочувствительностью и 4K 120fps.',
    34132000, 36000000, 3, 'new', {
      'Матрица': '35мм полный кадр, 12.1 МП',
      'Видео': '4K 120fps / FHD 240fps',
      'ISO': '80-102400 (расш. 40-409600)',
      'Автофокус': 'Real-Time Tracking AF',
      'Стабилизация': '5-осевая IBIS',
      'Дисплей': 'Поворотный 3 дюйма 1.44M точек',
      'Карта': 'Dual CFexpress Type A / SD',
      'Вес': '699г'
    });

  P('ilce-7rm4a', 1, 'Sony Alpha 7R IVA', 'ILCE-7RM4A',
    '61 МП разрешение для пейзажной и студийной фотографии. Непревзойдённая детализация.',
    41538000, null, 2, 'top', {
      'Матрица': '35мм полный кадр, 61 МП',
      'Видео': '4K 30fps',
      'ISO': '100-32000',
      'Автофокус': '693 точки фазовой детекции',
      'Стабилизация': '5-осевая IBIS',
      'Серийная': '10 кадр/с',
      'Видоискатель': 'OLED 5.76M точек',
      'Вес': '665г'
    });

  P('ilce-7m4', 1, 'Sony Alpha 7 IV', 'ILCE-7M4',
    'Универсальная полнокадровая камера нового поколения. 33 МП, 4K 60fps, профессиональный AF.',
    35420000, null, 4, 'new', {
      'Матрица': '35мм полный кадр, 33 МП',
      'Видео': '4K 60fps 10-бит',
      'ISO': '100-51200',
      'Автофокус': '759 точек',
      'Стабилизация': '5.5 ступени IBIS',
      'Карта': 'Dual SD UHS-II',
      'Дисплей': 'Поворотный 3 дюйма',
      'Вес': '659г'
    });

  P('ilce-6600', 1, 'Sony Alpha 6600', 'ILCE-6600',
    'Флагманская APS-C камера с лучшей в классе стабилизацией и профессиональным автофокусом.',
    17388000, 18500000, 6, 'top', {
      'Матрица': 'APS-C, 24.2 МП',
      'Видео': '4K 30fps',
      'ISO': '100-32000',
      'Автофокус': '425 точек',
      'Стабилизация': '5-осевая IBIS',
      'Батарея': 'До 810 кадров',
      'Крепление': 'Sony E-Mount',
      'Вес': '503г'
    });

  P('ilce-7cl', 1, 'Sony Alpha 7C Kit', 'ILCE-7CL',
    'Sony Alpha 7C в комплекте с объективом 28-60mm f/4-5.6. Готовый набор для старта.',
    24472000, null, 2, '', {
      'Матрица': '35мм полный кадр, 24.2 МП',
      'Объектив': '28-60mm f/4-5.6',
      'Видео': '4K 30fps',
      'Автофокус': 'Real-Time Tracking',
      'Стабилизация': '5-осевая IBIS',
      'Вес тела': '509г',
      'Крепление': 'Sony E-Mount',
      'Комплект': 'Тело + 28-60mm'
    });

  // Compact
  P('rx100-vii', 2, 'Sony RX100 VII', 'DSC-RX100M7',
    'Лучшая компактная камера в мире. 1-дюймовый сенсор и AF как у Alpha.',
    9800000, null, 8, 'top', {
      'Матрица': '1 дюйм Exmor RS, 20.1 МП',
      'Объектив': '24-200mm f/2.8-4.5',
      'Видео': '4K 30fps',
      'Серийная': '20 кадр/с',
      'Автофокус': '357 точек',
      'Видоискатель': 'Встроенный OLED',
      'Вес': '302г',
      'Карта': 'microSD'
    });

  P('rx10-iv', 2, 'Sony RX10 IV', 'DSC-RX10M4',
    'Суперзум с 1-дюймовым сенсором и объективом 24-600mm. Идеален для wildlife.',
    8400000, 9000000, 4, '', {
      'Матрица': '1 дюйм Exmor RS, 20.1 МП',
      'Объектив': '24-600mm f/2.4-4',
      'Видео': '4K 30fps',
      'Серийная': '24 кадр/с',
      'Автофокус': '315 точек',
      'Видоискатель': 'OLED 2.36M точек',
      'Вес': '1095г',
      'Стабилизация': 'Оптическая'
    });

  // Lenses
  P('sel2470gm', 3, 'FE 24-70mm f/2.8 GM', 'SEL2470GM',
    'Профессиональный зум G Master. Стандартный выбор для свадебной и репортажной съёмки.',
    18032000, null, 5, 'top', {
      'Фокусное расстояние': '24-70мм',
      'Диафрагма': 'f/2.8',
      'Крепление': 'Sony FE (E-Mount)',
      'Стабилизация': 'Нет (работает с IBIS)',
      'Фильтр': '82мм',
      'Вес': '886г',
      'Бленда': 'В комплекте',
      'Серия': 'G Master'
    });

  P('sel2470gm2', 3, 'FE 24-70mm f/2.8 GM II', 'SEL2470GM2',
    'Новейшее поколение G Master. На 20% легче предшественника, AF в 4 раза быстрее.',
    23828000, null, 3, 'new', {
      'Фокусное расстояние': '24-70мм',
      'Диафрагма': 'f/2.8',
      'Крепление': 'Sony FE (E-Mount)',
      'Вес': '695г (на 20% легче)',
      'Фильтр': '82мм',
      'Элементов': '20 в 15 группах',
      'AF мотор': '4 линейных XD',
      'Серия': 'G Master II'
    });

  P('sel35f14gm', 3, 'FE 35mm f/1.4 GM', 'SEL35F14GM',
    'Легендарный репортажный объектив. Боке мирового класса и резкость от открытой диафрагмы.',
    16100000, null, 4, '', {
      'Фокусное расстояние': '35мм',
      'Диафрагма': 'f/1.4',
      'Крепление': 'Sony FE (E-Mount)',
      'Вес': '524г',
      'Фильтр': '67мм',
      'Мин. дистанция': '0.27м',
      'Лепестков': '11',
      'Серия': 'G Master'
    });

  P('sel24105g', 3, 'FE 24-105mm f/4 G OSS', 'SEL24105G',
    'Универсальный объектив с оптической стабилизацией. От пейзажа до портрета.',
    11592000, 12500000, 7, 'top', {
      'Фокусное расстояние': '24-105мм',
      'Диафрагма': 'f/4',
      'Стабилизация': 'Оптическая OSS',
      'Крепление': 'Sony FE (E-Mount)',
      'Вес': '663г',
      'Фильтр': '77мм',
      'Мин. дистанция': '0.38м',
      'Серия': 'G Lens'
    });

  P('sel35f18f', 3, 'FE 35mm f/1.8', 'SEL35F18F',
    'Компактный и универсальный. Отличный баланс цены и качества для повседневной съёмки.',
    9016000, null, 6, '', {
      'Фокусное расстояние': '35мм',
      'Диафрагма': 'f/1.8',
      'Крепление': 'Sony FE (E-Mount)',
      'Вес': '280г',
      'Фильтр': '55мм',
      'Стабилизация': 'Нет',
      'Мин. дистанция': '0.22м',
      'Серия': 'FE'
    });

  P('sel1224g', 3, 'FE 12-24mm f/4 G', 'SEL1224G',
    'Ультраширокоугольный зум для пейзажа, архитектуры и интерьеров.',
    18998000, null, 3, '', {
      'Фокусное расстояние': '12-24мм',
      'Диафрагма': 'f/4',
      'Крепление': 'Sony FE (E-Mount)',
      'Вес': '565г',
      'Фильтр': 'Нет (выпуклая линза)',
      'Мин. дистанция': '0.28м',
      'Угол обзора': '122 - 84 градуса',
      'Серия': 'G Lens'
    });

  // Video
  P('fdr-ax700', 4, 'Sony FDR-AX700', 'FDR-AX700',
    'Профессиональная 4K видеокамера с 1-дюймовым сенсором для ENG и документалистики.',
    6200000, null, 5, 'top', {
      'Матрица': '1 дюйм Exmor RS CMOS',
      'Видео': '4K HDR 30fps / FHD 120fps',
      'Зум': '12x оптический (29-348мм)',
      'Стабилизация': 'Optical SteadyShot Active',
      'Автофокус': 'Fast Hybrid AF',
      'Дисплей': '3.5 дюйма 1.56M точек',
      'Карта': 'SD / SDHC / SDXC',
      'Вес': '1065г'
    });

  P('fdr-ax43a', 4, 'Sony FDR-AX43A', 'FDR-AX43A',
    'Компактная 4K видеокамера для семьи и путешествий. Лёгкая и удобная.',
    3800000, 4200000, 9, '', {
      'Матрица': '1/2.5 дюйма Exmor R CMOS',
      'Видео': '4K 30fps / FHD 60fps',
      'Зум': '20x оптический',
      'Стабилизация': 'B.O.S.S. 5-осевая',
      'Дисплей': '3 дюйма 921K точек',
      'Микрофон': 'Multi-Interface Shoe',
      'Карта': 'SD / SDHC / SDXC',
      'Вес': '565г'
    });

  // Accessories
  P('np-fz100', 5, 'Аккумулятор NP-FZ100', 'NP-FZ100',
    'Оригинальный аккумулятор Sony для камер Alpha 7 III, 7R IV, 7S III, 7 IV, 7C.',
    620000, null, 20, '', {
      'Ёмкость': '2280 мАч',
      'Напряжение': '7.2В',
      'Совместимость': 'Alpha 7 III / 7R IV / 7S III / 7 IV / 7C',
      'Зарядка': 'USB-C (быстрая зарядка)',
      'Тип': 'Литий-ионный',
      'Вес': '83г',
      'Оригинал': 'Да',
      'Гарантия': '1 год'
    });

  P('np-fw50', 5, 'Аккумулятор NP-FW50', 'NP-FW50',
    'Оригинальный аккумулятор для Alpha 6000-6600 и первого поколения Alpha 7.',
    370000, null, 15, '', {
      'Ёмкость': '1020 мАч',
      'Напряжение': '7.2В',
      'Совместимость': 'Alpha 6000 / 6100 / 6300 / 6400 / 6500 / 6600',
      'Тип': 'Литий-ионный',
      'Вес': '57г',
      'Оригинал': 'Да',
      'Гарантия': '1 год',
      'Зарядка': 'Через зарядное устройство'
    });

  // ── News ──
  const N = (slug, title, excerpt, body) =>
    run('INSERT INTO news (slug,title_ru,excerpt_ru,body_ru) VALUES (?,?,?,?)',
      [slug, title, excerpt, body]);

  N('sony-alpha-7c-ii',
    'Sony Alpha 7C II — официальный анонс',
    'Sony анонсировала обновлённую компактную полнокадровую камеру с 33 МП сенсором и ИИ-автофокусом нового поколения.',
    '<p>Sony официально представила Alpha 7C II — обновлённую версию самой компактной полнокадровой камеры. Новинка построена на 33 МП сенсоре Exmor R, том же что стоит в флагманской Alpha 7 IV, но в значительно более компактном корпусе.</p><h3>Ключевые улучшения</h3><p>Главное — искусственный интеллект в системе автофокуса. Камера распознаёт людей, животных, птиц и насекомых в реальном времени с высочайшей точностью.</p><ul><li>33 МП полнокадровый сенсор Exmor R</li><li>4K 60fps видео без кропа</li><li>ИИ-автофокус с распознаванием 8 классов объектов</li><li>Улучшенная 5-осевая стабилизация (7 ступеней)</li><li>USB-C PD зарядка во время съёмки</li></ul><h3>Наличие в Ташкенте</h3><p>Sony Alpha 7C II уже доступна в нашем шоуруме на проспекте Навои, 14. Приходите, чтобы протестировать автофокус лично.</p>'
  );

  N('gmaster-lenses-2025',
    'G Master 2025 — три новых объектива',
    'В линейку G Master добавлены 50mm f/1.2, 85mm f/1.4 II и 135mm f/1.8. Лучший выбор для портретной фотографии.',
    '<p>В 2025 году линейка G Master пополнилась тремя новыми объективами с XD Linear Motor для молниеносного автофокуса.</p><h3>Новые объективы</h3><ul><li><strong>FE 50mm f/1.2 GM</strong> — новый стандарт для портрета и стрит-фото</li><li><strong>FE 85mm f/1.4 GM II</strong> — на 30% легче, AF в 4 раза быстрее</li><li><strong>FE 135mm f/1.8 GM</strong> — лучшее боке в линейке Sony</li></ul><p>Все три объектива полностью совместимы с IBIS камер Alpha и оптимизированы для совместной работы с 5-осевой стабилизацией.</p><h3>Предзаказ</h3><p>Принимаем предзаказы в шоуруме. Позвоните: +998 95 170 55 22 или пишите в Telegram @SonyAlphaUZ.</p>'
  );

  N('trade-in-program',
    'Trade-In — обменяйте старую камеру на новую Sony',
    'Принесите вашу старую камеру Sony — мы вычтем её стоимость из цены новой модели. Скидка до 3 000 000 сум.',
    '<p>Запускаем программу Trade-In для клиентов SonyAlpha Ташкент. Если у вас есть старая камера Sony — приходите, мы превратим её в скидку на новую модель.</p><h3>Как работает Trade-In?</h3><ul><li>Принесите камеру в шоурум на пр. Навои, 14</li><li>Специалист оценит состояние техники бесплатно</li><li>Вы получаете скидочный сертификат</li><li>Применяете скидку при покупке новой камеры</li></ul><h3>Размер скидки</h3><p>Скидка зависит от модели и состояния: от 500 000 до 3 000 000 сум. Оценка бесплатна и ни к чему не обязывает.</p>'
  );

  // ── Admin ──
  const hash = bcrypt.hashSync('admin123', 10);
  run('INSERT INTO admins (username, password_hash) VALUES (?,?)', ['admin', hash]);
}

module.exports = { getDb, saveDb };
