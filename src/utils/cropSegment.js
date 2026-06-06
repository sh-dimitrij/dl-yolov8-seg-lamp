/**
 * cropSegment.js
 * Вырезает прямоугольную область из HTMLImageElement по bounding box
 * и возвращает dataURL (PNG) для передачи в CLIP.
 *
 * @param {HTMLImageElement} imgEl  — исходное изображение (тег <img>)
 * @param {number[]} bounding       — [x, y, w, h] в координатах модели (640×640)
 * @param {number[]} modelInputShape — [batch, ch, W, H], обычно [1,3,640,640]
 * @returns {string} dataURL
 */
export function cropSegment(imgEl, bounding, modelInputShape) {
  const [modelW, modelH] = modelInputShape.slice(2);

  // Реальные размеры отображаемого изображения
  const dispW = imgEl.naturalWidth  || imgEl.width;
  const dispH = imgEl.naturalHeight || imgEl.height;

  // Масштаб: из координат модели → пиксели изображения
  const scaleX = dispW / modelW;
  const scaleY = dispH / modelH;

  let [bx, by, bw, bh] = bounding;

  // Переводим в реальные пиксели
  const rx = Math.max(0, Math.round(bx * scaleX));
  const ry = Math.max(0, Math.round(by * scaleY));
  const rw = Math.min(Math.round(bw * scaleX), dispW - rx);
  const rh = Math.min(Math.round(bh * scaleY), dispH - ry);

  // Создаём временный canvas и рисуем вырезанный фрагмент
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = Math.max(rw, 1);
  tmpCanvas.height = Math.max(rh, 1);
  const ctx = tmpCanvas.getContext('2d');

  ctx.drawImage(imgEl, rx, ry, rw, rh, 0, 0, tmpCanvas.width, tmpCanvas.height);

  return tmpCanvas.toDataURL('image/png');
}

/**
 * Для каждой уникальной метки из массива boxes
 * берём первый (наиболее уверенный) bounding box и кропаем изображение.
 *
 * @param {HTMLImageElement} imgEl
 * @param {Array}  boxes           — [{ label, probability, bounding }]
 * @param {number[]} modelInputShape
 * @returns {{ [label]: string }}  — словарь label → dataURL
 */
export function cropSegmentsByLabel(imgEl, boxes, modelInputShape) {
  const seen = {};

  // boxes уже отсортированы по убыванию probability в detect.js
  for (const box of boxes) {
    if (!seen[box.label]) {
      seen[box.label] = cropSegment(imgEl, box.bounding, modelInputShape);
    }
  }

  return seen;
}