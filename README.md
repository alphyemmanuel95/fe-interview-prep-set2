# Frontend Interview Prep — Set 2

Five React + TypeScript features, each shipped as its own pull request. Every question lives on its own route, linked from the home page.

| #   | Question                      | PR link                                                                  |
| --- | ----------------------------- | ------------------------------------------------------------------------ |
| 1   | Shopping Cart                 | [#8](https://github.com/alphyemmanuel95/fe-interview-prep-set2/pull/8)   |
| 2   | Infinite Feed                 | [#9](https://github.com/alphyemmanuel95/fe-interview-prep-set2/pull/9)   |
| 3   | Kanban Board                  | [#10](https://github.com/alphyemmanuel95/fe-interview-prep-set2/pull/10) |
| 4   | Live Dashboard                |                                                                          |
| 5   | Comments with Offline Support |                                                                          |

**Video:**

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) in strict mode, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and related flags
- [Vite](https://vite.dev/) for the dev server and builds
- [React Router](https://reactrouter.com/) for routing and scroll restoration
- Plain CSS per component with BEM-prefixed class names, and design tokens in `src/index.css`
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for tests
- [ESLint](https://eslint.org/) (typescript-eslint `strictTypeChecked`, react-hooks, jsx-a11y strict) + [Prettier](https://prettier.io/)
- [Playwright](https://playwright.dev/) (Chromium) for browser smoke checks and screenshots

## Getting started

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Route        | Question                         |
| ------------ | -------------------------------- |
| `/cart`      | Q1 Shopping Cart                 |
| `/feed`      | Q2 Infinite Feed                 |
| `/kanban`    | Q3 Kanban Board                  |
| `/dashboard` | Q4 Live Dashboard                |
| `/comments`  | Q5 Comments with Offline Support |

## Scripts

| Script                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start the Vite dev server                 |
| `npm run build`        | Type-check and build for production       |
| `npm run lint`         | ESLint with zero warnings allowed         |
| `npm run typecheck`    | TypeScript project build check (`tsc -b`) |
| `npm test`             | Run all tests once (Vitest)               |
| `npm run test:watch`   | Run tests in watch mode                   |
| `npm run format`       | Format all files with Prettier            |
| `npm run format:check` | Check formatting without writing          |

## Running the tests

```bash
npm test
```

Tests sit next to the code they cover (`*.test.ts(x)`) and run in jsdom. The network, timers and browser APIs are stubbed, so the suite is deterministic and works offline.

## Project structure

```
src/
  app/        router, layout, home page, question registry
  features/   one folder per question (cart, feed, kanban, dashboard, comments)
  shared/     cross-feature utilities (typed storage, assertNever)
  test/       test setup
```
