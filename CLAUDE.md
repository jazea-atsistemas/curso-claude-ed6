# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Resttek is a restaurant management platform. It's an npm-workspaces monorepo (`packages/*`) with:

- `api`: Express 5, TypeScript (ESM), SQLite on port 3000
- `web-admin` (4200), `web-empleados` (4201), `web-clientes` (4202): Angular 21 apps
- `web-shared`: an Angular library used by all three apps (auth, interceptors, login/register components)

Project docs are in Spanish and live in `docs/`. Domain terms in the code are Spanish too (`cocinero`, `camarero`, `pendiente`, `preparando`, …). Detailed references: `docs/arquitectura/arquitectura-api.md`, `docs/arquitectura/arquitectura-frontend.md`, `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md`. If you change behavior those docs describe, update the docs too. The `docs/revisiones/` reports track past mismatches between the docs and the code.

## Commands

Run these from the repo root:

```bash
npm install              # installs and links all workspaces
npm run seed             # seed SQLite (NOT idempotent for dishes/orders: random IDs → duplicates on re-run)
npm run dev:api          # tsx watch src/server.ts → :3000 (GET /health); needs JWT_SECRET (>=32 chars) from packages/api/.env (copy .env.example), else it aborts
npm run dev:admin        # ng serve with proxy → :4200
npm run dev:empleados    # → :4201
npm run dev:clientes     # → :4202
npm test                 # vitest run (API only; the frontends have no tests)
```

To run a single test file or a single test, from `packages/api`:

```bash
npx vitest run src/services/order.service.test.ts
npx vitest run -t "test name substring"
npm run test:watch
```

To build a frontend, use `npm run build -w @resttek/web-admin` (or the matching workspace). The repo has no lint script.

Seed credentials: each user's password is their own email. Examples: `admin@resttek.com`, `gerente1@resttek.com` (role `manager`), `cocinero1@resttek.com`, `camarero1@resttek.com`, `cliente1@resttek.com`. The README has the full table.

## API architecture (`packages/api`)

The API mixes **two architectural styles**. Check which one a domain uses before you edit it:

1. **Hexagonal + DDD, only for `employee`** (`src/contexts/employee/{domain,application,infrastructure}`)
   - `Employee` is the only domain entity. It has a private constructor, validation inside `static create()`, and getters only.
   - There are only two value-object classes: `Email` (in `contexts/shared`) and `Role`.
   - Use cases are classes with one `execute()` method and constructor injection.
   - Interfaces use an `I` prefix (`IEmployeeRepository`, `IAuthService`).
   - Dependencies are wired in `infrastructure/http/dependencies.ts`.
2. **Layered, for `restaurant`, `dish`, `ingredient`, `order`** (`src/{models,repositories,services,controllers,routes}/<domain>.*.ts`)
   - Models are plain interfaces. Enums are validated by the `normalizeX()` functions in `models/`.
   - Each service has several methods, and validation lives in the service.
   - A repository interface has no `I` prefix and sits in the same file as its `Sqlite*` implementation.
   - Dependencies are wired at the top of each `routes/*.routes.ts` file.

`contexts/shared/` is not a business context. It holds `Email`, the `authenticate`/`authorize(roles)` middlewares and the `errorHandler`.

Things to keep in mind:

- **Imports**: imports use tsconfig path aliases (`@config/*`, `@errors/*`, `@shared/*`, `@employee/*`, `@models/*`, `@repositories/*`, `@services/*`, `@controllers/*`, `@routes/*`, `@scripts/*`). They must end in `.js` because the package is ESM with `module: nodenext`. At runtime `tsx` resolves the aliases; in tests `vite-tsconfig-paths` does.
- **Routing**: all routes are mounted in `src/app.ts` under `/api/v1`. Nested routers such as `/restaurants/:restaurantId/...` need `Router({ mergeParams: true })`.
- **Errors**: domain errors extend `AppError` (`src/errors/DomainErrors.ts`). `errorHandler` picks the HTTP status by error class name: an explicit list maps to 404, `InvalidCredentialsError` to 401, any other `AppError` to 400, everything else to 500. **A new not-found error must be added to the 404 list in `errorHandler.ts`.** `OrderController` is the exception: it uses its own try/catch and never calls `next(error)`.
- **Database**: `src/config/database.ts` exports one shared `dbConfig` instance. Migrations are `CREATE TABLE IF NOT EXISTS` statements in `runInitialMigrations()`, and there is no separate migration tool. `PRAGMA foreign_keys = ON` is set, so test fixtures must insert parent rows (for example `restaurants`) before child rows. The DB file is `packages/api/resttek.db`; with `NODE_ENV=test` it is `:memory:`. SQL renames snake_case to camelCase with column aliases.
- **Orders**: creating an order expands quantities, so `quantity: 3` is stored as 3 `order_items` rows with quantity 1 each. This lets each unit's status be tracked on its own. Order routes have no `authorize()`, only `authenticate`.
- **Tests**: unit tests sit next to the code they test (`*.test.ts`). Test doubles are in `contexts/employee/application/mocks/` and `repositories/mocks/`. There are no HTTP or integration tests, and `supertest` is installed but unused.

## Frontend architecture

- Angular 21 throughout: standalone components, signals, zoneless (no `zone.js`), functional guards and interceptors, lazy-loaded routes. Icons come from `lucide-angular`, and each app registers only the icons it uses through `LucideAngularModule.pick()` in `app.config.ts`.
- **`web-admin` and `web-empleados`** organize code as `features/<feature>/{models,pages,services,store}`. Components talk only to a `*Store`, a `providedIn: 'root'` class that keeps private signals, exposes them read-only, tracks `loading`/`error`/data, and wraps service Observables with `firstValueFrom`. After a mutation the store updates its list in place with `.update()`. In `web-empleados`, `OrderStore` polls every 30 s because the API has no websockets.
- **`web-clientes`** is different. Models and services live in `core/`, features are single component files, and the root component is called `App`. The only store is `CartStore`, which is local state. Everything else calls services directly with `.subscribe()`, and polling uses `setInterval` inside components.
- **`web-shared`** is consumed from source (`main: src/index.ts`, no build step). Restart the frontend dev server after you change it. Export new pieces from `src/index.ts`. It provides `AuthStore` (token and user in localStorage), `AuthService`, `authGuard`, `authInterceptor` (adds the Bearer token) and `errorInterceptor` (on a 401 it clears the session and redirects to `/login`).
- **API base URL**: every app proxies `/api` to `localhost:3000` (`proxy.conf.json`), and `environment.apiUrl` is `/api/v1`. `web-clientes` services inject the `API_URL` token, while `web-admin` and `web-empleados` services import `environment.apiUrl` directly.
- **Design system**: each app's `src/styles.css` has its own copy. `web-shared/src/lib/styles/base.css` is not imported anywhere. A change to a shared style has to be copied into all three apps (`web-empleados` has extra rules).
- **Roles**: the manager role is `'manager'`, not `'gerente'`. In `web-empleados`, `roleGuard(...roles)` (`core/guards/role.guard.ts`) protects `/cocina`, `/barra` and `/salon` and redirects to `defaultRouteFor(role)`; `ShellComponent` filters the menu links with the same rules. These are client-side checks only. The API enforces the real authorization.

## Scripts

`scripts/seed-issues.sh` creates GitHub issues from `scripts/issues.json` using `gh` and `jq`. Use `--dry-run` to preview them. It is not part of the app.
