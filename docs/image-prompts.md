# Иллюстрации для сайта: промпты и правила

Все картинки на сайте — в одном стиле: **плоская векторная сцена из работы клиента**, где жёлтая линия данных соединяет место, где происходит работа (касса, склад, ресепшен), с местом, где ведётся учёт. Линия данных — фирменная деталь, как строка «→ результат» в тексте.

## Правила стиля

- **Цвета только наши.** Контур тёмно-синий `#13254A`, заливки синий `#2A5FD6` и голубой `#DCE7FB`, фон `#F3F6FB`. Жёлтый `#FFC93C` — только на линии данных. Никакого зелёного (это цвет конкурента), фиолетового и градиентов.
- **Мало предметов.** 2–3 человека и 3–5 предметов, которые относятся к делу. Без растений, ламп, полок «для уюта».
- **Лица простые**, без прорисованных черт. Детальные лица и руки выдают генерацию.
- **Без текста.** Никаких надписей, цифр, логотипов: генератор пишет их с ошибками. Реальный текст сайт выводит сам.
- **Фон в цвет страницы** `#F3F6FB`, без рамки и тени, чтобы картинка не выглядела вставленной.

## Как добавить

1. Сгенерируйте картинку: общий промпт + промпт сцены (ChatGPT, Midjourney и т. п.). Сделайте 3–4 варианта, выберите один.
2. Проверьте: нет надписей, лишних пальцев, «плавленых» предметов, зелёного цвета. Толщина линий как у остальных картинок.
3. Сохраните в формате **WebP, 1600×900** под указанным именем в папку `public/img/photo/`.
4. Сайт покажет картинку сам, как только файл появится. Затем опубликуйте: `npm run publish -- public`.

Для одинакового стиля генерируйте все картинки в одном чате или с одним «референсом» — первой удачной картинкой.

## Общая часть промпта

Добавляйте в начало каждого промпта:

> Flat vector illustration in a clean editorial style. Consistent medium-weight outline in deep navy #13254A. Fills only in blue #2A5FD6, light blue #DCE7FB and white. Plain background #F3F6FB with plenty of empty space, no frame, no shadow under the scene. One thin warm-yellow #FFC93C line shows data flowing between the places in the scene — it is the only yellow element. Two or three people at most, simple faces without detailed features, natural relaxed poses. Minimal props, only what the scene needs: no plants, no lamps, no decorative shelves. No text, no letters, no numbers, no logos, no watermark. No green, no purple, no gradients, no glow, no 3D. Aspect ratio 16:9.

## Сцены

### Отрасли — страница «Отраслевые решения»

| Файл | Отрасль | Сцена |
| --- | --- | --- |
| `ind-opt.webp` | Оптовая торговля | On the left, a warehouse worker scans a box on a pallet with a handheld scanner; a thin yellow data line runs to the right, where a sales manager at a desk sees the order on a laptop and a delivery van waits outside a loading door. |
| `ind-retail.webp` | Розница и супермаркеты | On the left, a cashier at a supermarket checkout hands a bag to a customer paying by phone; a thin yellow data line runs from the till to the right, where a store owner checks sales on a tablet next to a small shelf of products. |
| `ind-auto.webp` | Автосалоны и СТО | On the left, a mechanic works under a car raised on a lift; a thin yellow data line runs to the right, where a service advisor at a reception counter shows a work order on a monitor to a car owner holding keys. |
| `ind-logistics.webp` | Логистика | On the left, a driver hands a document to a dispatcher next to a white box truck; a thin yellow data line runs to the right, to an office where a manager sees the truck's route and fuel on a laptop. |
| `ind-services.webp` | Услуги | On the left, an administrator at a salon reception desk books a client; a thin yellow data line runs to the right, to a small glass-walled office where an accountant reviews a report on a laptop. |

### Решения — страница конфигурации

| Файл | Страница | Сцена |
| --- | --- | --- |
| `sol-1c-ut-kz.webp` | 1С:Управление торговлей для Казахстана | Three connected places from left to right: a sales manager on a phone call at a desk, a warehouse worker picking goods from a rack, and an accountant at a laptop; one thin yellow data line runs through all three, showing a single order moving from sale to warehouse to accounting. |

Для новых страниц решений берите ту же схему: **где начинается работа → жёлтая линия данных → где её видит учёт или владелец**. Имя файла — `sol-<адрес страницы>.webp`.

## Кейсы и новости

Обложки кейсов и новостей — **только реальные фото с проектов**: серверная, склад клиента, экран отчёта без персональных данных. Загружаются в админке. Сгенерированная картинка в кейсе подрывает доверие.
