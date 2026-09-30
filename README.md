# marketplace-ui

Одна страница: показать настройки маркетплейса для аккаунта и отредактировать их.
Потребитель GraphQL-схемы BFF.

```
marketplace-ui (этот репозиторий)  →  marketplace-bff  →  marketplace-api
```

## Как устроено

| Файл | Что это | Кто создаёт |
|---|---|---|
| `src/SettingsPage.tsx` | страница и GraphQL-запросы UI (`query Settings`, `mutation UpdateSettings`) | руками |
| `src/main.tsx` | точка входа: GraphQL-клиент (urql), адрес BFF, выбор аккаунта | руками |
| `codegen.ts` | настройки GraphQL Code Generator: откуда схема, где запросы, куда писать типы | руками |
| `src/gql/` | типы для запросов UI | **генерируется** `npm run gen`, руками не править |
| `src/SettingsPage.test.tsx` | тесты страницы, BFF замокан через MSW | руками |

## Запуск

Нужен Node.js 22. Порядок: marketplace-api → marketplace-bff → marketplace-ui.

```bash
npm install
npm run dev
```

| Переменная | По умолчанию | Что это |
|---|---|---|
| `PORT` | `5173` | порт UI |
| `VITE_BFF_URL` | `http://localhost:4000/graphql` | адрес GraphQL BFF |

PowerShell: `$env:PORT=5174; $env:VITE_BFF_URL="http://localhost:4001/graphql"; npm run dev`

Проверка: открой http://localhost:5173. Будет показан аккаунт `acc-1`, другой аккаунт выбирается в адресе:
http://localhost:5173/?accountId=acc-2. Для нового аккаунта страница пишет «Настройки ещё не сохранены».
Заполни форму, нажми «Сохранить» и обнови страницу: данные придут из API через BFF.
Проверить, что они действительно сохранены в API: `curl http://localhost:8080/accounts/acc-2/settings`.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | запускает UI (Vite) |
| `npm run gen` | скачивает `schema.graphql` из main marketplace-bff, проверяет по нему запросы UI и генерирует `src/gql/` |
| `npm run typecheck` | проверка типов (`tsc`) всего кода, включая тесты |
| `npm test` | тесты (vitest) |

После `npm run gen` посмотри `git diff src/gql`. Если что-то поменялось, закоммить.

## Как генерируются типы

GraphQL Code Generator берёт два источника:
1. **схему BFF** — какие типы и поля вообще существуют;
2. **запросы UI** — строки внутри `graphql(\`...\`)` в `src/**/*.tsx`.

Для каждого запроса он создаёт тип ответа **только с запрошенными полями** (`SettingsQuery`) и тип переменных
(`SettingsQueryVariables`). Функция `graphql()` из `src/gql` возвращает типизированный документ, поэтому `useQuery`
сам знает тип `result.data`.

Отсюда два способа, которыми изменение схемы BFF ломает UI:
- запрос UI использует поле, которого больше нет, — **`npm run gen` падает** с ошибкой
  `Cannot query field "..." on type "Settings"`;
- поле осталось, но поменялся его тип или обязательность — `npm run gen` проходит, но меняются типы в `src/gql`,
  и **падает `npm run typecheck`** там, где код или моки на это рассчитывали.

Поле, которое UI не запрашивает, можно удалить из схемы BFF, и UI этого не заметит.

## Тесты

Vitest + React Testing Library. Страница рендерится в jsdom (браузер, эмулируемый в Node.js), BFF замокан через
MSW: GraphQL-обработчики перехватывают операции по имени (`Settings`, `UpdateSettings`). Ответы и переменные в
моках типизированы сгенерированными типами (`graphql.query<SettingsQuery, SettingsQueryVariables>`): если схема
изменится, `npm run typecheck` упадёт на моке, который больше ей не соответствует.

## CI (`.github/workflows/ci.yml`)

Job `check` запускается на push в main, на PR, вручную и раз в сутки:
`npm ci` → `gen` (свежая схема BFF) → предупреждение, если схема поменялась → `typecheck` → `test`.

Изменение схемы в marketplace-bff само этот CI не запускает, потому что это событие другого репозитория (подробнее в README marketplace-bff).
Поэтому здесь тоже есть расписание и ручной запуск.

Проверки breaking changes здесь нет: UI никому не отдаёт контракт, он только потребитель.

## Инструменты: зачем каждый

- **React + Vite + TypeScript** — UI и dev-сервер с мгновенной перезагрузкой. Vite не проверяет типы при запуске,
  поэтому есть отдельная команда `typecheck`.
- **urql** — GraphQL-клиент. Выбран вместо graphql-request, потому что даёт React-хуки `useQuery` и `useMutation` с
  состоянием загрузки и ошибки: в компоненте не нужно самому писать `useEffect` и `useState` для запроса.
  graphql-request — просто функция отправки запроса, без интеграции с React. Минимальный кэш urql после мутации
  сам перезапрашивает затронутые запросы.
- **GraphQL Code Generator (client preset)** — генерирует типы из схемы BFF и запросов UI. Проблема, которую решает:
  UI, написанный с типами «по памяти», продолжает собираться, когда схема BFF изменилась, и падает только у пользователя.
- **Vitest** — тесты, **React Testing Library** — работа со страницей как у пользователя (поиск полей по подписи,
  ввод, клик), **jest-dom** — проверки вида `toHaveValue`.
- **MSW** — мок BFF на уровне сетевых запросов: компонент и urql работают как в браузере, не зная о моке.

## Куда встроится то, что будет позже

- **Auth** — `accountId` будет браться из данных вошедшего пользователя, а не из адреса, в urql-клиент добавится
  заголовок с токеном (`fetchOptions` в `src/main.tsx`).
- **Reporting** — новая страница со своими запросами. Типы для них сгенерирует тот же `npm run gen`.

## Эксперименты

См. [EXPERIMENTS.md](https://github.com/DariaGuzich/marketplace-api/blob/main/EXPERIMENTS.md) в marketplace-api.
