'use strict';
const content = require('./content');

// Начальные данные: справочник отраслей и явные примеры-заглушки.
// Реальных кейсов пока нет — примеры показывают, как будет выглядеть раздел.
function seed(repo) {
  if (repo.listIndustries().length === 0) {
    content.seedIndustries.forEach((name, i) => repo.addIndustry(name, (i + 1) * 10));
  }
  const ind = (name) => (repo.listIndustries().find((x) => x.name === name) || {}).id;

  if (repo.listCases().length === 0) {
    repo.saveCase({
      title: 'Пример кейса: переход на 1С 8.3 в рознице',
      slug: 'primer-perehod-na-8-3',
      client: 'Название клиента',
      status: 'published',
      industry_id: ind('Супермаркеты и розница'),
      directions: ['1c', 'it'],
      solutions: '1С:Розница, 1С:Бухгалтерия для Казахстана, Kaspi Pay',
      summary: 'Пример — заполните в админке. Одно-два предложения о проекте для карточки в списке.',
      result_line: 'результат проекта одной строкой',
      task: 'Пример — заполните в админке.\n\nОпишите исходную ситуацию: что было у клиента, что мешало работе, какие вопросы владельца оставались без ответа.',
      solution: 'Пример — заполните в админке.\n\n- Что сделали по шагам\n- Какие конфигурации и интеграции использовали\n- Сколько длился проект',
      result: 'Пример — заполните в админке.\n\nЧто изменилось после запуска. Указывайте только подтверждённые цифры.',
      cover: '/img/ind_retail.jpg',
      gallery: ['/img/money.jpg', '/img/margin.jpg'],
      sort: 10,
    });
    repo.saveCase({
      title: 'Пример кейса: ИТ-инфраструктура и резервные копии',
      slug: 'primer-it-infrastruktura',
      status: 'published',
      industry_id: ind('Логистика'),
      directions: ['it'],
      solutions: 'Резервное копирование, VPN, 1С:УАТ',
      summary: 'Пример — заполните в админке. Кратко о задаче и о том, что сделали.',
      result_line: 'результат проекта одной строкой',
      task: 'Пример — заполните в админке.',
      solution: 'Пример — заполните в админке.',
      result: 'Пример — заполните в админке.',
      cover: '/img/ind_log.jpg',
      sort: 20,
    });
    repo.saveCase({
      title: 'Пример кейса: сайт с обменом с 1С',
      slug: 'primer-sayt-s-obmenom',
      status: 'published',
      industry_id: ind('Оптовая торговля'),
      directions: ['web', 'design'],
      solutions: 'Интернет-магазин, 1С:УТ, фирменный стиль',
      summary: 'Пример — заполните в админке. Кратко о задаче и о том, что сделали.',
      result_line: 'результат проекта одной строкой',
      task: 'Пример — заполните в админке.',
      solution: 'Пример — заполните в админке.',
      result: 'Пример — заполните в админке.',
      cover: '/img/web_shop.jpg',
      sort: 30,
    });
  }

  if (repo.listNews().length === 0) {
    repo.saveNews({
      title: 'Пример новости: заголовок',
      slug: 'primer-novosti',
      status: 'published',
      excerpt: 'Пример — заполните в админке. Короткий анонс для списка новостей.',
      body: 'Пример — заполните в админке.\n\nТекст новости поддерживает **выделение**, списки и ссылки.',
      cover: '/img/it_hub.jpg',
    });
  }
}

module.exports = { seed };
