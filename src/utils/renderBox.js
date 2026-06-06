/**
 * Render prediction boxes
 * @param {HTMLCanvasElement} canvas canvas tag reference
 * @param {Array[Object]} boxes boxes array
 */

// Russian display names (used only for info cards in App.js, NOT for canvas labels)
export const CLASS_LABELS_RU = {
  "table_lamp": "Настольная лампа",
  "luminaire":  "Светильник",
  "chandelier": "Люстра",
};

// Info shown in cards after detection
export const CLASS_INFO = {
  "table_lamp": {
    description: "Компактный источник направленного света для рабочей поверхности или прикроватной тумбы.",
    params: [
      { name: "Тип",        value: "Настольный" },
      { name: "Назначение", value: "Локальное освещение" },
      { name: "Установка",  value: "На поверхность" },
    ],
  },
  "luminaire": {
    description: "Потолочный или настенный светильник для общего или акцентного освещения помещения.",
    params: [
      { name: "Тип",        value: "Потолочный / настенный" },
      { name: "Назначение", value: "Общее освещение" },
      { name: "Установка",  value: "Монтаж к потолку или стене" },
    ],
  },
  "chandelier": {
    description: "Декоративный многоламповый светильник, подвешиваемый к потолку, — акцент интерьера.",
    params: [
      { name: "Тип",        value: "Подвесной" },
      { name: "Назначение", value: "Декор + освещение" },
      { name: "Установка",  value: "Крепление к потолку" },
    ],
  },
};

// ── renderBoxes: ОРИГИНАЛ из merge.txt, не изменён ──────────────────────────
export const renderBoxes = (ctx, boxes) => {
  // font configs
  const font = `${Math.max(
    Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
    14
  )}px Arial`;
  ctx.font = font;
  ctx.textBaseline = "top";

  boxes.forEach((box) => {
    const klass = box.label;
    const color = box.color;
    const score = (box.probability * 100).toFixed(1);
    const [x1, y1, width, height] = box.bounding;

    // draw border box
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(Math.min(ctx.canvas.width, ctx.canvas.height) / 200, 2.5);
    ctx.strokeRect(x1, y1, width, height);

    // draw the label background.
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(klass + " - " + score + "%").width;
    const textHeight = parseInt(font, 10); // base 10
    const yText = y1 - (textHeight + ctx.lineWidth);
    ctx.fillRect(
      x1 - 1,
      yText < 0 ? 0 : yText,
      textWidth + ctx.lineWidth,
      textHeight + ctx.lineWidth
    );

    // Draw labels
    ctx.fillStyle = "#ffffff";
    ctx.fillText(klass + " - " + score + "%", x1 - 1, yText < 0 ? 1 : yText + 1);
  });
};

// ── Colors: оригинальная структура, только 3 первых цвета заменены ───────────
export class Colors {
  constructor() {
    this.palette = [
      "#583EE0", // index 0 → table_lamp
      "#C5A23F", // index 1 → luminaire
      "#34D1B7", // index 2 → chandelier
      "#FFB21D",
      "#CFD231",
      "#48F90A",
      "#92CC17",
      "#3DDB86",
      "#1A9334",
      "#00D4BB",
      "#2C99A8",
      "#00C2FF",
      "#344593",
      "#6473FF",
      "#0018EC",
      "#8438FF",
      "#520085",
      "#CB38FF",
      "#FF95C8",
      "#FF37C7",
    ];
    this.n = this.palette.length;
  }

  get = (i) => this.palette[Math.floor(i) % this.n];

  static hexToRgba = (hex, alpha) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), alpha]
      : null;
  };
}