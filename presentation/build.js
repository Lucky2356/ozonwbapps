// Презентация: предложение по разработке нового сайта для THE FLEX
// Премиальная тёмная тема под бренд (глубокий фон + «розовое золото»)
const pptxgen = require("pptxgenjs");
const p = new pptxgen();

p.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
p.layout = "WIDE";
const W = 13.333, H = 7.5;

// --- Палитра ---
const BG = "1B1619";      // глубокий тёмный плам-чарколь
const CARD = "26201F";    // карточки чуть светлее фона
const CARD2 = "2E2624";
const GOLD = "C9A66B";    // розовое золото — акцент
const ROSE = "C98B8B";    // пыльная роза — второй акцент
const TEXT = "F3ECE6";    // тёплый off-white
const MUTE = "A99E96";    // приглушённый
const LINE = "3A312E";

const HF = "Georgia";     // заголовки — сериф
const BFONT = "Calibri";  // тело

// --- Хелперы ---
function bg(slide, color = BG) {
  slide.background = { color };
}
function kicker(slide, text, x = 0.6, y = 0.55, color = GOLD) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 11, h: 0.3, fontFace: BFONT, fontSize: 12, color,
    charSpacing: 4, bold: true, align: "left",
  });
}
function title(slide, text, x = 0.6, y = 0.85, w = 12.1, size = 38) {
  slide.addText(text, {
    x, y, w, h: 1.0, fontFace: HF, fontSize: size, color: TEXT,
    bold: true, align: "left", margin: 0,
  });
}
// декоративный крупный круг-контур (мотив бренда)
function ring(slide, x, y, d, color = GOLD, thick = 1.5) {
  slide.addShape(p.ShapeType.ellipse, {
    x, y, w: d, h: d, fill: { type: "none" },
    line: { color, width: thick, transparency: 35 },
  });
}
function numCircle(slide, x, y, d, n, fill = GOLD, txt = BG) {
  slide.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill } });
  slide.addText(String(n), {
    x, y, w: d, h: d, align: "center", valign: "middle",
    fontFace: HF, fontSize: 18, bold: true, color: txt, margin: 0,
  });
}
function card(slide, x, y, w, h, fill = CARD) {
  slide.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.1, fill: { color: fill },
    line: { color: LINE, width: 1 },
  });
}

// ============================================================
// СЛАЙД 1 — ТИТУЛ
// ============================================================
let s = p.addSlide(); bg(s);
ring(s, 9.2, -1.4, 5.6, GOLD, 1.5);
ring(s, 10.7, 3.6, 4.2, ROSE, 1.2);
s.addText("ПРЕДЛОЖЕНИЕ ПО РАЗРАБОТКЕ", {
  x: 0.7, y: 1.55, w: 9, h: 0.4, fontFace: BFONT, fontSize: 13,
  color: GOLD, bold: true, charSpacing: 5,
});
s.addText([
  { text: "Новый сайт для\n", options: { color: TEXT } },
  { text: "THE FLEX", options: { color: GOLD } },
  { text: "®", options: { color: GOLD, fontSize: 22, superscript: true } },
], {
  x: 0.7, y: 2.0, w: 9.5, h: 2.1, fontFace: HF, fontSize: 50, bold: true,
  lineSpacingMultiple: 1.02, margin: 0,
});
s.addText("Премиальный женский фитнес заслуживает премиального сайта", {
  x: 0.72, y: 4.25, w: 8.5, h: 0.5, fontFace: HF, fontSize: 17,
  italic: true, color: ROSE,
});
// подпись автора
s.addShape(p.ShapeType.line, { x: 0.75, y: 5.55, w: 0, h: 1.2, line: { color: GOLD, width: 2 } });
s.addText([
  { text: "Имя Фамилия\n", options: { fontSize: 20, bold: true, color: TEXT, fontFace: HF } },
  { text: "DevOps-инженер · Fullstack-разработчик (front + back)\n", options: { fontSize: 13, color: MUTE } },
  { text: "Разработка и запуск сайтов «под ключ»", options: { fontSize: 13, color: MUTE } },
], { x: 1.0, y: 5.5, w: 8, h: 1.3, valign: "top", margin: 0, lineSpacingMultiple: 1.15 });
s.addText("Новосибирск · 2026", {
  x: 9.5, y: 6.85, w: 3.2, h: 0.3, align: "right", fontFace: BFONT,
  fontSize: 11, color: MUTE, charSpacing: 2,
});

// ============================================================
// СЛАЙД 2 — КТО Я
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "Обо мне");
title(s, "Кто будет делать ваш сайт");
s.addText(
  "Я DevOps-инженер: каждый день отвечаю за то, чтобы сервисы работали быстро, " +
  "стабильно и были доступны пользователям. В свободное время верстаю фронтенд и " +
  "пишу бэкенд — и довожу проект до конца: от первой строки кода до сайта, " +
  "открытого в интернете на собственном домене.",
  { x: 0.6, y: 1.9, w: 5.5, h: 3.2, fontFace: BFONT, fontSize: 16,
    color: MUTE, lineSpacingMultiple: 1.3, align: "left", valign: "top" });
s.addText("Один человек закрывает весь цикл — без передачи задач между подрядчиками.", {
  x: 0.6, y: 5.35, w: 5.5, h: 1.0, fontFace: HF, fontSize: 15, italic: true,
  color: ROSE, lineSpacingMultiple: 1.2 });

const skills = [
  ["DevOps-инженерия", "Серверы, развёртывание, надёжность и безопасность — моя основная работа."],
  ["Fullstack-разработка", "Фронтенд (вёрстка, интерфейсы) и бэкенд (логика, данные, API)."],
  ["Запуск с нуля", "Разворачиваю сайт полностью: домен, HTTPS, хостинг — доступен из интернета."],
];
let yy = 1.95;
skills.forEach((it, i) => {
  card(s, 6.55, yy, 6.15, 1.45);
  numCircle(s, 6.85, yy + 0.42, 0.62, i + 1);
  s.addText(it[0], { x: 7.7, y: yy + 0.18, w: 4.85, h: 0.4, fontFace: HF, fontSize: 17, bold: true, color: GOLD, margin: 0 });
  s.addText(it[1], { x: 7.7, y: yy + 0.62, w: 4.8, h: 0.7, fontFace: BFONT, fontSize: 12.5, color: MUTE, margin: 0, lineSpacingMultiple: 1.12 });
  yy += 1.62;
});

// ============================================================
// СЛАЙД 3 — Я ИЗУЧИЛ БРЕНД
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "Я изучил ваш проект");
title(s, "Понимаю, для кого делаю сайт");
s.addText("THE FLEX® — сеть женских фитнес-клубов нового уровня. Сайт должен передавать этот премиальный характер.", {
  x: 0.6, y: 1.8, w: 12.1, h: 0.6, fontFace: BFONT, fontSize: 14.5, color: MUTE, lineSpacingMultiple: 1.2 });

const facts = [
  ["3", "клуба в Новосибирске", "Зыряновская · Д. Ковальчук · Фрунзе"],
  ["9", "направлений тренировок", "от растяжки и пилатеса до кардио-бокса"],
  ["256", "часов обучения тренера", "акцент на экспертизе и доверии"],
  ["55", "тренировок ежедневно", "плотное расписание мини-групп"],
  ["360°", "подход к телу", "диагностика, питание, массаж, онлайн"],
  ["1", "закрытое сообщество", "эксклюзивные события для участниц"],
];
const gx0 = 0.6, gy0 = 2.6, gw = 3.9, gh = 1.85, gxg = 0.18, gyg = 0.2;
facts.forEach((f, i) => {
  const c = i % 3, r = Math.floor(i / 3);
  const x = gx0 + c * (gw + gxg), y = gy0 + r * (gh + gyg);
  card(s, x, y, gw, gh, c === 1 ? CARD2 : CARD);
  s.addText(f[0], { x: x + 0.25, y: y + 0.18, w: gw - 0.5, h: 0.8, fontFace: HF, fontSize: 40, bold: true, color: GOLD, margin: 0 });
  s.addText(f[1], { x: x + 0.27, y: y + 1.0, w: gw - 0.5, h: 0.4, fontFace: BFONT, fontSize: 14, bold: true, color: TEXT, margin: 0 });
  s.addText(f[2], { x: x + 0.27, y: y + 1.38, w: gw - 0.5, h: 0.4, fontFace: BFONT, fontSize: 11, color: MUTE, margin: 0, lineSpacingMultiple: 1.05 });
});

// ============================================================
// СЛАЙД 4 — ЗАЧЕМ НОВЫЙ САЙТ
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "Польза для бизнеса");
title(s, "Что новый сайт даст клубу");
const benefits = [
  ["Онлайн-запись 24/7", "Клиентка записывается на тренировку сама, без звонков и переписки в мессенджерах."],
  ["Расписание онлайн", "Актуальные занятия по всем клубам в одном месте — меньше нагрузки на администраторов."],
  ["Продажа абонементов", "Оплата и продление прямо на сайте — выручка не теряется между визитами."],
  ["Скорость и мобильность", "Быстрая загрузка на телефоне, где сидит почти вся аудитория клуба."],
  ["Больше клиентов из поиска", "Грамотное SEO приводит женщин, которые ищут фитнес в Новосибирске."],
];
let by = 1.95;
benefits.forEach((b, i) => {
  card(s, 0.6, by, 12.13, 0.92);
  numCircle(s, 0.85, by + 0.16, 0.6, i + 1);
  s.addText(b[0], { x: 1.7, y: by + 0.12, w: 3.5, h: 0.7, fontFace: HF, fontSize: 16, bold: true, color: GOLD, valign: "middle", margin: 0 });
  s.addText(b[1], { x: 5.3, y: by + 0.12, w: 7.2, h: 0.7, fontFace: BFONT, fontSize: 13, color: MUTE, valign: "middle", margin: 0, lineSpacingMultiple: 1.1 });
  by += 1.04;
});

// ============================================================
// СЛАЙД 5 — ПОД КЛЮЧ
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "Как я работаю");
title(s, "Весь сайт «под ключ» — один ответственный");
s.addText("Вам не нужно собирать команду из дизайнера, верстальщика, программиста и админа. Я закрываю всю цепочку сам.", {
  x: 0.6, y: 1.8, w: 12.1, h: 0.6, fontFace: BFONT, fontSize: 14.5, color: MUTE, lineSpacingMultiple: 1.2 });
const steps = [
  ["Дизайн", "под бренд THE FLEX"],
  ["Фронтенд", "вёрстка и интерфейс"],
  ["Бэкенд", "логика и данные"],
  ["Сервер", "хостинг и настройка"],
  ["Домен · HTTPS", "защищённый доступ"],
  ["Запуск", "сайт в интернете"],
];
const sw = 1.92, sgap = 0.07, sx0 = 0.6, sy = 3.1, sh = 2.5;
steps.forEach((st, i) => {
  const x = sx0 + i * (sw + sgap);
  card(s, x, sy, sw, sh, i % 2 ? CARD2 : CARD);
  numCircle(s, x + sw / 2 - 0.32, sy + 0.32, 0.64, i + 1);
  s.addText(st[0], { x: x + 0.08, y: sy + 1.15, w: sw - 0.16, h: 0.55, align: "center", fontFace: HF, fontSize: 15.5, bold: true, color: GOLD, margin: 0 });
  s.addText(st[1], { x: x + 0.1, y: sy + 1.7, w: sw - 0.2, h: 0.7, align: "center", fontFace: BFONT, fontSize: 11.5, color: MUTE, margin: 0, lineSpacingMultiple: 1.1 });
  if (i < steps.length - 1) {
    s.addText("›", { x: x + sw - 0.02, y: sy + 0.55, w: sgap + 0.1, h: 0.6, align: "center", valign: "middle", fontFace: HF, fontSize: 22, color: GOLD, margin: 0 });
  }
});
s.addText("Без посредников и студий-перекупщиков — вы общаетесь напрямую с тем, кто делает сайт.", {
  x: 0.6, y: 6.05, w: 12.1, h: 0.6, fontFace: HF, fontSize: 15, italic: true, color: ROSE, align: "center" });

// ============================================================
// СЛАЙД 6 — ТЕХНОЛОГИИ И НАДЁЖНОСТЬ
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "Под капотом");
title(s, "Современные технологии и DevOps-надёжность");
// левая колонка — технологии
card(s, 0.6, 2.0, 5.95, 4.6);
s.addText("ТЕХНОЛОГИИ", { x: 0.95, y: 2.3, w: 5.3, h: 0.4, fontFace: BFONT, fontSize: 13, bold: true, color: GOLD, charSpacing: 3 });
const tech = [
  "Адаптивный фронтенд — корректно на телефоне, планшете и ПК",
  "Бэкенд и база данных под задачи клуба",
  "Подключение онлайн-оплаты и интеграций",
  "SEO-оптимизация и аналитика с первого дня",
  "Чистый код, который можно развивать дальше",
];
s.addText(tech.map(t => ({ text: t, options: { bullet: { code: "2022", indent: 18 }, color: TEXT } })), {
  x: 0.95, y: 2.9, w: 5.3, h: 3.5, fontFace: BFONT, fontSize: 14, color: TEXT, lineSpacingMultiple: 1.25, paraSpaceAfter: 10, valign: "top" });
// правая колонка — надёжность
card(s, 6.78, 2.0, 5.95, 4.6, CARD2);
s.addText("DEVOPS-НАДЁЖНОСТЬ", { x: 7.13, y: 2.3, w: 5.3, h: 0.4, fontFace: BFONT, fontSize: 13, bold: true, color: ROSE, charSpacing: 3 });
const ops = [
  "Автоматический деплой обновлений без простоя",
  "Регулярные бэкапы — данные не потеряются",
  "Защита от атак и спама в формах",
  "Мониторинг доступности 24/7",
  "Высокий аптайм — сайт работает, когда нужен клиенту",
];
s.addText(ops.map(t => ({ text: t, options: { bullet: { code: "2022", indent: 18 }, color: TEXT } })), {
  x: 7.13, y: 2.9, w: 5.3, h: 3.5, fontFace: BFONT, fontSize: 14, color: TEXT, lineSpacingMultiple: 1.25, paraSpaceAfter: 10, valign: "top" });

// ============================================================
// СЛАЙД 7 — БИЗНЕС-ФУНКЦИИ
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "Что будет уметь сайт");
title(s, "Функции, которые работают на клуб");
const feats = [
  ["Запись и расписание", "Онлайн-запись на занятия, фильтр по клубу, направлению и тренеру."],
  ["Оплата абонементов", "Покупка и продление онлайн, разные тарифы, промокоды."],
  ["Личный кабинет", "История тренировок, активный абонемент, напоминания."],
  ["CRM и аналитика", "Заявки попадают в систему, видно источники клиентов и конверсию."],
  ["Уведомления", "Подтверждения и напоминания в Telegram / по SMS / на почту."],
  ["Удобная админка", "Контент, расписание и цены меняете сами, без программиста."],
];
const fx0 = 0.6, fy0 = 2.0, fw = 3.93, fh = 2.15, fxg = 0.16, fyg = 0.18;
feats.forEach((f, i) => {
  const c = i % 3, r = Math.floor(i / 3);
  const x = fx0 + c * (fw + fxg), y = fy0 + r * (fh + fyg);
  card(s, x, y, fw, fh, r === 0 ? CARD : CARD2);
  s.addShape(p.ShapeType.roundRect, { x: x + 0.28, y: y + 0.28, w: 0.5, h: 0.5, rectRadius: 0.25, fill: { color: GOLD } });
  s.addText(String(i + 1), { x: x + 0.28, y: y + 0.28, w: 0.5, h: 0.5, align: "center", valign: "middle", fontFace: HF, fontSize: 15, bold: true, color: BG, margin: 0 });
  s.addText(f[0], { x: x + 0.28, y: y + 0.92, w: fw - 0.56, h: 0.45, fontFace: HF, fontSize: 16, bold: true, color: GOLD, margin: 0 });
  s.addText(f[1], { x: x + 0.28, y: y + 1.35, w: fw - 0.5, h: 0.7, fontFace: BFONT, fontSize: 12, color: MUTE, margin: 0, lineSpacingMultiple: 1.15 });
});

// ============================================================
// СЛАЙД 8 — ЭТАПЫ И СРОКИ
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "План работ");
title(s, "Этапы и сроки");
const phases = [
  ["Анализ и дизайн", "1–2 недели", "Изучаю задачи, собираю структуру, рисую макеты под бренд."],
  ["Вёрстка фронтенда", "2–3 недели", "Адаптивные страницы, анимация, мобильная версия."],
  ["Бэкенд и функции", "2–3 недели", "Запись, оплата, личный кабинет, интеграции, админка."],
  ["Инфраструктура", "≈ 1 неделя", "Сервер, домен, HTTPS, бэкапы, мониторинг, защита."],
  ["Тест и передача", "≈ 1 неделя", "Тестирование, наполнение, обучение, запуск."],
];
const tlx = 1.15, tly = 2.15, rowH = 0.82;
// вертикальная линия таймлайна
s.addShape(p.ShapeType.line, { x: tlx, y: tly + 0.1, w: 0, h: (phases.length - 1) * rowH + 0.2, line: { color: LINE, width: 2 } });
phases.forEach((ph, i) => {
  const y = tly + i * rowH;
  numCircle(s, tlx - 0.32, y - 0.14, 0.64, i + 1);
  s.addText(ph[0], { x: tlx + 0.6, y: y - 0.2, w: 4.6, h: 0.45, fontFace: HF, fontSize: 17, bold: true, color: TEXT, valign: "middle", margin: 0 });
  s.addText(ph[1], { x: tlx + 0.6, y: y + 0.22, w: 4.6, h: 0.35, fontFace: BFONT, fontSize: 12.5, bold: true, color: GOLD, margin: 0 });
  s.addText(ph[2], { x: 6.5, y: y - 0.18, w: 6.2, h: 0.8, fontFace: BFONT, fontSize: 12.5, color: MUTE, valign: "middle", margin: 0, lineSpacingMultiple: 1.12 });
});
// итог
const sumY = tly + phases.length * rowH + 0.12;
card(s, 6.4, sumY, 6.33, 0.8, CARD2);
s.addText([
  { text: "Итого ориентировочно:  ", options: { color: TEXT, bold: true } },
  { text: "7–10 недель", options: { color: GOLD, bold: true } },
  { text: "  до запуска", options: { color: MUTE } },
], { x: 6.6, y: sumY, w: 6, h: 0.8, fontFace: HF, fontSize: 15, valign: "middle", margin: 0 });
s.addText("Сроки уточняются после\nсогласования объёма функций.", {
  x: 1.15, y: sumY + 0.05, w: 4.8, h: 0.7, fontFace: BFONT, fontSize: 11.5, italic: true, color: MUTE, lineSpacingMultiple: 1.1 });

// ============================================================
// СЛАЙД 9 — ПОЧЕМУ ДОВЕРИТЬ МНЕ
// ============================================================
s = p.addSlide(); bg(s);
kicker(s, "Почему мне");
title(s, "Почему этот проект можно доверить мне");
const why = [
  ["Один ответственный за результат", "Дизайн, код и сервер в одних руках — некому перекладывать ответственность."],
  ["Инженерная стабильность", "Опыт DevOps означает: сайт не «упадёт» в самый нужный момент и защищён."],
  ["Прозрачность на каждом шаге", "Показываю промежуточный результат, объясняю решения простыми словами."],
  ["Поддержка после запуска", "Не исчезаю после сдачи — обновления, доработки и помощь остаются за мной."],
];
const wx0 = 0.6, wy0 = 2.05, ww = 6.0, wh = 2.15, wxg = 0.13, wyg = 0.18;
why.forEach((it, i) => {
  const c = i % 2, r = Math.floor(i / 2);
  const x = wx0 + c * (ww + wxg), y = wy0 + r * (wh + wyg);
  card(s, x, y, ww, wh, c === r % 2 ? CARD : CARD2);
  numCircle(s, x + 0.35, y + 0.35, 0.66, i + 1, ROSE);
  s.addText(it[0], { x: x + 1.25, y: y + 0.35, w: ww - 1.6, h: 0.75, fontFace: HF, fontSize: 16.5, bold: true, color: GOLD, margin: 0, lineSpacingMultiple: 1.05 });
  s.addText(it[1], { x: x + 1.25, y: y + 1.12, w: ww - 1.55, h: 0.85, fontFace: BFONT, fontSize: 13, color: MUTE, margin: 0, lineSpacingMultiple: 1.18 });
});

// ============================================================
// СЛАЙД 10 — КОНТАКТЫ / ПРИЗЫВ
// ============================================================
s = p.addSlide(); bg(s);
ring(s, -1.6, 3.3, 5.2, GOLD, 1.5);
ring(s, 10.0, -1.6, 5.0, ROSE, 1.2);
s.addText("ГОТОВ НАЧАТЬ", {
  x: 0.7, y: 1.5, w: 11, h: 0.4, fontFace: BFONT, fontSize: 13, bold: true, color: GOLD, charSpacing: 5, align: "center" });
s.addText("Давайте обсудим ваш новый сайт", {
  x: 0.7, y: 2.0, w: 11.93, h: 1.3, fontFace: HF, fontSize: 40, bold: true, color: TEXT, align: "center" });
s.addText("Покажу примеры, отвечу на вопросы и предложу решение под задачи THE FLEX®.", {
  x: 1.5, y: 3.35, w: 10.3, h: 0.6, fontFace: HF, fontSize: 16, italic: true, color: ROSE, align: "center" });
// контактные карточки (плейсхолдеры)
const cons = [["Телефон", "+7 (___) ___-__-__"], ["Telegram", "@username"], ["E-mail", "you@email.com"]];
const cw = 3.6, cgap = 0.4, ctotal = cons.length * cw + (cons.length - 1) * cgap;
const cstart = (W - ctotal) / 2;
cons.forEach((c, i) => {
  const x = cstart + i * (cw + cgap);
  card(s, x, 4.5, cw, 1.2, CARD);
  s.addText(c[0].toUpperCase(), { x, y: 4.68, w: cw, h: 0.3, align: "center", fontFace: BFONT, fontSize: 11, bold: true, color: GOLD, charSpacing: 3 });
  s.addText(c[1], { x, y: 5.02, w: cw, h: 0.45, align: "center", fontFace: HF, fontSize: 16, bold: true, color: TEXT });
});
s.addText("Имя Фамилия · DevOps-инженер · Fullstack-разработчик", {
  x: 0.7, y: 6.4, w: 11.93, h: 0.4, align: "center", fontFace: BFONT, fontSize: 13, color: MUTE, charSpacing: 1 });

// --- Сохранение ---
p.writeFile({ fileName: "THE_FLEX_предложение.pptx" }).then(f => console.log("OK:", f));
