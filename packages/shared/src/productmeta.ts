/**
 * Извлечение метаданных товара из названия для фасетных фильтров (бренд, категория, аксессуар).
 * Данных со структурными атрибутами маркетплейсы не отдают — поэтому всё выводим из заголовка.
 * Логика чистая (без I/O) и покрыта тестами.
 */

/** Токенизация названия в нижний регистр (для эвристик). */
function lowerTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Известные бренды: токен (в нижнем регистре) → каноническое отображаемое имя. */
const BRAND_MAP: Record<string, string> = {
  samsung: 'Samsung',
  galaxy: 'Samsung',
  apple: 'Apple',
  iphone: 'Apple',
  ipad: 'Apple',
  macbook: 'Apple',
  airpods: 'Apple',
  imac: 'Apple',
  xiaomi: 'Xiaomi',
  redmi: 'Xiaomi',
  poco: 'Xiaomi',
  huawei: 'Huawei',
  honor: 'Honor',
  realme: 'Realme',
  oppo: 'OPPO',
  vivo: 'Vivo',
  oneplus: 'OnePlus',
  tecno: 'Tecno',
  infinix: 'Infinix',
  nokia: 'Nokia',
  motorola: 'Motorola',
  google: 'Google',
  pixel: 'Google',
  sony: 'Sony',
  lg: 'LG',
  asus: 'ASUS',
  acer: 'Acer',
  lenovo: 'Lenovo',
  hp: 'HP',
  dell: 'Dell',
  msi: 'MSI',
  huion: 'Huion',
  philips: 'Philips',
  panasonic: 'Panasonic',
  bosch: 'Bosch',
  haier: 'Haier',
  indesit: 'Indesit',
  beko: 'Beko',
  dyson: 'Dyson',
  tefal: 'Tefal',
  redmond: 'Redmond',
  polaris: 'Polaris',
  jbl: 'JBL',
  marshall: 'Marshall',
  beats: 'Beats',
  sennheiser: 'Sennheiser',
  canon: 'Canon',
  nikon: 'Nikon',
  gopro: 'GoPro',
  nike: 'Nike',
  adidas: 'Adidas',
  reebok: 'Reebok',
  puma: 'Puma',
  defender: 'Defender',
  logitech: 'Logitech',
  a4tech: 'A4Tech',
  kingston: 'Kingston',
  transcend: 'Transcend',
  sandisk: 'SanDisk',
  tp: 'TP-Link',
};

/** Латинские токены, которые не являются брендами (модификаторы/единицы). */
const BRAND_STOP = new Set([
  'pro',
  'max',
  'ultra',
  'plus',
  'mini',
  'lite',
  'neo',
  'new',
  'gen',
  'gb',
  'tb',
  'mb',
  'ssd',
  'hdd',
  'ram',
  'fhd',
  'uhd',
  'hd',
  'oled',
  'led',
  'qled',
  'ips',
  'ios',
  'android',
  'wifi',
  'usb',
  'type',
  'nfc',
  'sim',
  'esim',
  'mah',
  'hz',
  'se',
  'air',
  'edition',
]);

/**
 * Определяет бренд по названию: сначала ищет известный бренд/алиас, иначе берёт первый
 * латинский токен-кандидат (не модификатор). Возвращает каноническое имя или undefined.
 */
export function extractBrand(title: string): string | undefined {
  const tokens = lowerTokens(title);
  for (const t of tokens) {
    if (BRAND_MAP[t]) return BRAND_MAP[t];
  }
  for (const t of tokens) {
    if (/^[a-z][a-z0-9]*$/.test(t) && t.length >= 2 && !BRAND_STOP.has(t)) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
  }
  return undefined;
}

/** Категория → список ключевых подстрок (ищем как вхождение в нижнем регистре названия). */
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: 'Аксессуары', keywords: ['чехол', 'стекло', 'плен', 'бампер', 'накладк', 'ремешок', 'кабел', 'зарядк', 'адаптер', 'переходник', 'держател', 'подставк', 'докстанц', 'powerbank', 'пауэрбанк', 'power bank'] },
  { category: 'Смартфоны', keywords: ['смартфон', 'телефон', 'iphone', 'galaxy', 'redmi', 'poco', 'мобильный телефон'] },
  { category: 'Ноутбуки', keywords: ['ноутбук', 'laptop', 'macbook', 'ультрабук'] },
  { category: 'Планшеты', keywords: ['планшет', 'ipad', 'tablet'] },
  { category: 'Наушники', keywords: ['наушник', 'airpods', 'earbuds', 'гарнитур', 'tws'] },
  { category: 'Часы и браслеты', keywords: ['смарт-час', 'смарт час', 'часы', 'watch', 'браслет', 'фитнес-браслет'] },
  { category: 'Телевизоры', keywords: ['телевизор', 'tv', 'смарт-тв'] },
  { category: 'Мониторы', keywords: ['монитор'] },
  { category: 'Фото и видео', keywords: ['фотоаппарат', 'камера', 'объектив', 'gopro', 'экшн-камера'] },
  { category: 'Бытовая техника', keywords: ['холодильник', 'стиральн', 'пылесос', 'микроволнов', 'духов', 'посудомоеч', 'кофеварк', 'кофемашин', 'чайник', 'утюг', 'фен', 'блендер', 'мультиварк'] },
  { category: 'Компьютеры и комплектующие', keywords: ['видеокарт', 'процессор', 'материнск', 'оперативн', 'ssd', 'жёсткий диск', 'жесткий диск', 'блок питания', 'клавиатур', 'мышь', 'мышка'] },
  { category: 'Игровые приставки', keywords: ['playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'приставк'] },
  { category: 'Обувь', keywords: ['кроссовк', 'ботинк', 'туфли', 'кеды', 'сапоги', 'сандал'] },
  { category: 'Одежда', keywords: ['куртк', 'футболк', 'платье', 'джинс', 'рубашк', 'свитер', 'худи', 'брюки', 'пальто'] },
  { category: 'Красота и здоровье', keywords: ['парфюм', 'духи', 'крем', 'шампунь', 'тонал', 'помад', 'маска для лица'] },
];

/**
 * Определяет укрупнённую категорию товара по названию. Возвращает 'Другое', если не распознано.
 * Важно: аксессуары проверяются первыми (чтобы «Чехол для iPhone» не попал в «Смартфоны»).
 */
export function detectCategory(title: string): string {
  const t = title.toLowerCase().replace(/ё/g, 'е');
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.category;
  }
  return 'Другое';
}

const ACCESSORY_KEYWORDS = [
  'чехол',
  'стекло',
  'плен',
  'бампер',
  'накладк',
  'ремешок',
  'кабел',
  'зарядк',
  'адаптер',
  'переходник',
  'держател',
  'подставк',
  'докстанц',
  'защитн',
];

/** Похоже ли название на аксессуар (чехол/стекло/кабель и т.п.). */
export function isAccessory(title: string): boolean {
  const t = title.toLowerCase().replace(/ё/g, 'е');
  return ACCESSORY_KEYWORDS.some((k) => t.includes(k));
}

/** Запрос сам про аксессуар? Тогда исключать аксессуары не нужно. */
export function isAccessoryQuery(query: string): boolean {
  return isAccessory(query);
}
