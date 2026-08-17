/* GIF Preview — фоновая часть плагина.
   Живёт в песочнице Penpot: читает выделение и отдаёт в панель описание заливки.
   Сам файл картинки не качает — панель забирает его у Penpot по media id. */

penpot.ui.open("GIF Preview", "", { width: 460, height: 580 });

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

penpot.on("selectionchange", push);
penpot.on("themechange", theme => penpot.ui.sendMessage({ type: "theme", theme: theme }));

// первый кадр состояния сразу при открытии
penpot.ui.sendMessage({ type: "theme", theme: penpot.theme });
push();
