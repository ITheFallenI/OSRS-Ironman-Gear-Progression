export function initPanZoom(svg, { width, height, onChange }) {
  const maxZoom = 12;
  const pointers = new Map();
  let center = { x: width / 2, y: height / 2 };
  let zoom = 1;
  let dragged = false;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const fit = () => Math.max(width / svg.clientWidth, height / svg.clientHeight);
  const units = () => fit() / zoom;

  function constrain(value, span, limit) {
    const inset = span / 2 - 20 * units();
    return span >= limit ? limit / 2 : clamp(value, inset, limit - inset);
  }

  function draw() {
    if (!svg.clientWidth || !svg.clientHeight) return;
    const w = svg.clientWidth * units();
    const h = svg.clientHeight * units();
    center.x = constrain(center.x, w, width);
    center.y = constrain(center.y, h, height);
    svg.setAttribute("viewBox", `${center.x - w / 2} ${center.y - h / 2} ${w} ${h}`);
    onChange?.(zoom <= 1, zoom >= maxZoom);
  }

  function reset() {
    center = { x: width / 2, y: height / 2 };
    zoom = 1;
    draw();
  }

  function zoomBy(factor, point) {
    const oldUnits = units();
    zoom = clamp(zoom * factor, 1, maxZoom);
    if (point) {
      const rect = svg.getBoundingClientRect();
      const delta = oldUnits - units();
      center.x += (point.x - rect.left - rect.width / 2) * delta;
      center.y += (point.y - rect.top - rect.height / 2) * delta;
    }
    draw();
  }

  function frame({ x, y, w, h }) {
    const padding = 300;
    center = { x: x + w / 2, y: y + h / 2 };
    zoom = clamp(fit() / Math.max((w + padding) / svg.clientWidth, (h + padding) / svg.clientHeight), 1, maxZoom);
    draw();
  }

  function reveal({ x, y, w, h }) {
    const halfWidth = (svg.clientWidth / 2 - 12) * units();
    const halfHeight = (svg.clientHeight / 2 - 12) * units();
    if (x < center.x - halfWidth) center.x = x + halfWidth;
    if (x + w > center.x + halfWidth) center.x = x + w - halfWidth;
    if (y < center.y - halfHeight) center.y = y + halfHeight;
    if (y + h > center.y + halfHeight) center.y = y + h - halfHeight;
    draw();
  }

  function panBy(dx, dy) {
    center.x -= dx * units();
    center.y -= dy * units();
    draw();
  }

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1);
    zoomBy(Math.exp(clamp(-delta * .002, -.4, .4)), { x: event.clientX, y: event.clientY });
  }, { passive: false });

  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (pointers.size === 0) dragged = false;
    const { clientX: x, clientY: y, pointerId } = event;
    pointers.set(pointerId, { x, y, startX: x, startY: y });
    event.target.setPointerCapture(pointerId);
  });

  svg.addEventListener("pointermove", (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const { clientX: x, clientY: y } = event;
    const dx = x - previous.x;
    const dy = y - previous.y;
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const start = Math.max(1, Math.hypot(previous.x - other.x, previous.y - other.y));
      const distance = Math.hypot(x - other.x, y - other.y);
      zoomBy(distance / start, { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 });
      panBy(dx / 2, dy / 2);
      dragged = true;
    } else if (dragged) {
      panBy(dx, dy);
    } else if (Math.hypot(x - previous.startX, y - previous.startY) >= 5) {
      panBy(x - previous.startX, y - previous.startY);
      dragged = true;
    }
    Object.assign(previous, { x, y });
    svg.classList.toggle("is-dragging", dragged);
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) svg.classList.remove("is-dragging");
  }
  svg.addEventListener("pointerup", endPointer);
  svg.addEventListener("pointercancel", endPointer);
  svg.addEventListener("lostpointercapture", endPointer);
  svg.addEventListener("click", (event) => {
    if (dragged && event.detail > 0) event.stopPropagation();
  }, true);

  new ResizeObserver(draw).observe(svg);
  reset();
  return { reset, zoomBy, frame, panBy, reveal };
}
