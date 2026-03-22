# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a VitePress blog site with technical content organized into categories: AI, algorithms, articles, engineering, interviews, Node.js, React, visualization, and Vue. The site is deployed with base path `/blog/`.

## Development

### Common Commands

- `npm run dev` – Start VitePress development server
- `npm run serve` – Preview production build locally
- `npm run build` – Build static site to `.vitepress/dist`
- `npm run lint` – Run ESLint on all files
- `npm run lint:fix` – Auto-fix ESLint issues
- `npm run prettier` – Format code with Prettier
- `npm run commit` – Interactive commit with Commitizen

### Running a Single Test

No test suite is configured for the main blog. Example projects under `code/` may have their own test scripts.

## Project Structure

```
├── ai/                    # AI-related markdown articles
├── alg/                   # Algorithm articles
├── article/               # General technical articles
├── code/                  # Standalone example projects (browser, node, rollup, etc.)
├── engineer/              # Engineering practices
├── interview/             # Interview questions
├── node/                  # Node.js articles
├── react/                 # React articles and tutorials
├── visualization/         # Data visualization content
├── vue/                   # Vue.js articles
├── assets/                # Images and static assets
├── public/                # Public static files
├── .vitepress/            # VitePress configuration
│   ├── config.js          # Main config importing sidebar configs
│   ├── config/            # Sidebar definitions per category
│   └── dist/              # Built site (generated)
├── .husky/                Git hooks (pre‑commit runs lint‑staged)
├── .eslintrc.js           ESLint config (React + TypeScript)
├── .prettierrc.js         Prettier config (4 spaces, single quotes)
└── package.json           Root dependencies and scripts
```

Each category directory contains markdown files that correspond to sidebar links. The sidebar configuration is split per category in `.vitepress/config/`. The navigation is defined in `.vitepress/config/nav.js`.

The `code/` directory contains independent example projects; they are not part of the blog build but may be referenced in articles.

## Code Quality

- ESLint is configured for React and TypeScript with 4‑space indentation.
- Prettier formats code with 120‑char line width, no semicolons, single quotes.
- `lint‑staged` runs Prettier on staged files under `code/**/*.{js,jsx,ts,tsx}` during pre‑commit.
- Commit messages follow conventional commits (Commitizen installed, but commit‑lint hook is currently commented out).

## Git Workflow

1. Changes are automatically formatted on commit via Husky + lint‑staged.
2. Use `npm run commit` for interactive conventional commits.
3. The default branch is `master`.

## Deployment

- Automated deployment via GitHub Actions (`.github/workflows/deploy.yml`) on push to `master`.
- Builds the VitePress site and deploys to GitHub Pages.
- The site is served under the base path `/blog/` as configured in `.vitepress/config.js`.

## Notes

- The site uses VitePress 1.0.0‑beta.6.
- Images are stored in `assets/` and referenced via relative paths.
- Example projects are not linted or built as part of the main site; treat them as separate codebases.
- The commit‑msg hook is disabled; you may enable it by uncommenting the line in `.husky/commit‑msg`.
