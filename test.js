// Проверка панели плагина без Penpot: подсовываем сообщения и локальную гифку вместо запроса к серверу.
async (page) => {
  const DIR = 'D:/Projects/YandexDisk/%D0%A1%D1%82%D1%83%D0%B4%D0%B8%D1%8F/%D0%9C%D0%B0%D1%82%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D1%8B/%D0%A1%D0%B0%D0%B9%D1%82%20dekart';
  const GIF = 'D:/Projects/YandexDisk/Студия/Материалы/Сайт dekart/TEMP/etap-1-analiz-konkurentov/crops/red-logo.gif';

  // любой запрос к by-file-media-id отдаём локальной гифкой
  await page.route('**/assets/by-file-media-id/**', route =>
    route.fulfill({ path: GIF, contentType: 'image/gif' }));

  await page.setViewportSize({ width: 460, height: 580 });
  await page.goto(`file:///${DIR}/plugins/penpot-gif-preview/index.html`, { waitUntil: 'load' });

  const out = {};
  const send = m => page.evaluate(msg => window.postMessage(msg, '*'), m);

  await send({ type: 'theme', theme: 'dark' });
  await send({ type: 'empty' });
  await page.waitForTimeout(300);
  out.пусто = await page.locator('.hint b').textContent();

  await send({ type: 'noimage', name: 'цитата 3' });
  await page.waitForTimeout(200);
  out.без_картинки = await page.locator('.hint b').textContent();

  await send({ type: 'image', id: 'test-id', mtype: 'image/gif', w: 150, h: 64,
               name: 'фрагмент: логотип ↔ штрихкод (gif)', fileName: 'red-logo' });
  await page.waitForTimeout(900);

  out.картинка_видна = await page.locator('.stage img').isVisible();
  out.размер = await page.locator('.stage img').evaluate(i => i.naturalWidth + 'x' + i.naturalHeight);
  out.подпись = await page.locator('#mTitle').textContent();
  out.детали = (await page.locator('#mSub').textContent()).replace(/\s+/g, ' ').trim();
  out.тема = await page.evaluate(() => document.body.className);

  // анимация в панели: два снимка с паузой
  const sig = b => { let s = 0; for (let i = 0; i < b.length; i++) s = (s * 31 + b[i]) % 2147483647; return s; };
  const a = sig(await page.locator('.stage').screenshot());
  await page.waitForTimeout(700);
  const b = sig(await page.locator('.stage').screenshot());
  out.анимация_идёт = a !== b;

  await page.locator('#bActual').click();
  await page.waitForTimeout(200);
  out.режим_1к1 = await page.locator('.stage').evaluate(e => e.className);

  await page.locator('#bFit').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'plugins/penpot-gif-preview/proba.png' });

  // теперь адрес не отвечает — панель обязана сказать об этом, а не показать битую иконку
  await page.unroute('**/assets/by-file-media-id/**');
  await page.route('**/assets/by-file-media-id/**', r => r.fulfill({ status: 404, body: '' }));
  await send({ type: 'image', id: 'no-such-id', mtype: 'image/gif', w: 10, h: 10, name: 'битая' });
  await page.waitForTimeout(800);
  out.при_ошибке = await page.locator('.hint b').textContent();

  return out;
}
