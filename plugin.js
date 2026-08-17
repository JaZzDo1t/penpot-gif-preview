/* GIF Preview — фоновая часть плагина.
   Живёт в песочнице Penpot: читает выделение и отдаёт в панель описание заливки.
   Сам файл картинки не качает — панель забирает его у Penpot по media id. */

// Файл указан явно: пустая строка открывает корень плагина, а хостинг вроде CDN
// отдаёт на каталог листинг файлов вместо страницы.
penpot.ui.open("GIF Preview", "index.html", { width: 460, height: 580 });

function describe() {
  let s;
  try {
    s = penpot.selection && penpot.selection.length ? penpot.selection[0] : null;
  } catch (e) {
    return { type: "error", message: String(e && e.message) };
  }
  if (!s) return { type: "empty" };

  let fills = null;
  try {
    fills = s.fills;                       // у текста бывает "mixed" — тогда не массив
  } catch (e) { /* заливка недоступна */ }

  if (!Array.isArray(fills)) return { type: "noimage", name: s.name };

  const withImage = fills.find(f => f && f.fillImage);
  if (!withImage) return { type: "noimage", name: s.name };

  const img = withImage.fillImage;
  return {
    type: "image",
    id: img.id,
    mtype: img.mtype || "",
    w: img.width || 0,
    h: img.height || 0,
    fileName: img.name || "",
    name: s.name || "",
    shapeW: Math.round(s.width || 0),
    shapeH: Math.round(s.height || 0)
  };
}

function push() {
  penpot.ui.sendMessage(describe());
}

// Запасной путь: если панели не дают загрузить картинку напрямую (политика
// безопасности вокруг её iframe), качаем байты отсюда и отдаём их как data-URL.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// btoa в песочнице может отсутствовать — считаем сами
function toBase64(bytes) {
  if (typeof btoa === "function") {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b || 0) >> 4)]
      + (b === undefined ? "=" : B64[((b & 15) << 2) | ((c || 0) >> 6)])
      + (c === undefined ? "=" : B64[c & 63]);
  }
  return out;
}

// Реализация fetch в песочнице урезана: у ответа может не быть привычных методов.
// Поэтому перебираем способы забрать байты и, если не вышло, докладываем что есть.
async function readBytes(r) {
  if (typeof r.arrayBuffer === "function") return new Uint8Array(await r.arrayBuffer());
  if (typeof r.blob === "function") {
    const b = await r.blob();
    if (b && typeof b.arrayBuffer === "function") return new Uint8Array(await b.arrayBuffer());
  }
  if (r.body && typeof r.body.getReader === "function") {
    const reader = r.body.getReader(), parts = [];
    let total = 0, chunk;
    while (!(chunk = await reader.read()).done) { parts.push(chunk.value); total += chunk.value.length; }
    const all = new Uint8Array(total);
    let at = 0;
    parts.forEach(p => { all.set(p, at); at += p.length; });
    return all;
  }
  const have = [];
  for (const k in r) have.push(k);
  throw new Error("ответ без байтов · есть: " + have.slice(0, 12).join(",")
    + " · тип: " + (r.constructor && r.constructor.name));
}

function viaXhr(url) {
  return new Promise((ok, no) => {
    if (typeof XMLHttpRequest !== "function") return no(new Error("XHR недоступен"));
    const x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.responseType = "arraybuffer";
    x.onload = () => x.status === 200 ? ok(new Uint8Array(x.response)) : no(new Error("XHR " + x.status));
    x.onerror = () => no(new Error("XHR не прошёл"));
    x.send();
  });
}

penpot.ui.onMessage(async msg => {
  if (!msg || msg.type !== "need-bytes") return;
  const errors = [];
  for (const way of ["fetch", "xhr"]) {
    try {
      let bytes;
      if (way === "fetch") {
        if (typeof fetch !== "function") throw new Error("fetch недоступен");
        const r = await fetch(msg.url);
        if (!r.ok && r.status) throw new Error("HTTP " + r.status);
        bytes = await readBytes(r);
      } else {
        bytes = await viaXhr(msg.url);
      }
      penpot.ui.sendMessage({
        type: "bytes",
        dataUrl: "data:" + (msg.mtype || "image/gif") + ";base64," + toBase64(bytes),
        bytes: bytes.length
      });
      return;
    } catch (e) { errors.push(way + ": " + String(e && e.message)); }
  }
  penpot.ui.sendMessage({ type: "bytes-failed", message: errors.join(" | ") });
});

penpot.on("selectionchange", push);
penpot.on("themechange", theme => penpot.ui.sendMessage({ type: "theme", theme: theme }));

// первый кадр состояния сразу при открытии
penpot.ui.sendMessage({ type: "theme", theme: penpot.theme });
push();
