# QualityTrack Frontend

Web application for QualityTrack, built with React, Vite, TypeScript, and Tailwind CSS.

This app is part of the monorepo and runs as the `frontend` workspace package.

## Description

The frontend will be the main interface for viewing and managing the MVP workflow:

Customer -> Request -> Quote -> Work Order -> Route Sheet -> Production -> Quality Control -> Delivery.

The central screen of the product will be the Work Order dossier, where the different roles can review the full traceability of a job.

## Project setup

Install dependencies from the monorepo root:

```bash
pnpm install
```

To add a dependency only to the frontend package:

```bash
pnpm --filter frontend add package-name
```

To add a development dependency only to the frontend package:

```bash
pnpm --filter frontend add -D package-name
```

## Compile and run the project

```bash
# development
pnpm dev:frontend

# equivalent command
pnpm --filter frontend dev

# production build
pnpm build:frontend
```

## Run checks

```bash
# lint
pnpm lint:frontend

# build
pnpm build:frontend
```

## Configuration

Tailwind CSS is integrated with Vite through `@tailwindcss/vite` in `vite.config.ts`.

Global CSS is imported from `src/index.css`:

```css
@import 'tailwindcss';
```

The main TypeScript configuration for the app lives in `tsconfig.app.json` and extends the shared React base from the monorepo:

```json
{
  "extends": "../../packages/tsconfig-base/react.json"
}
```

## Project structure

```text
apps/frontend/
  src/
    App.tsx
    index.css
    main.tsx
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
```

## Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
