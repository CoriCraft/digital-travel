# Repository Guidelines

## Language & Communication
- This project primarily uses Chinese for product copy, comments, commit messages, and PR descriptions.
- Keep technical identifiers (file names, function names, API fields) in English unless business terms require Chinese.
- When adding user-facing text, prefer simplified Chinese and keep wording consistent with existing pages.

## Project Structure & Module Organization
This repository is a WeChat Mini Program.

- `app.js`, `app.json`, `app.wxss`: global app lifecycle, routing, and shared styles.
- `pages/<feature>/`: page-level modules, usually split into `*.js`, `*.json`, `*.wxml`, `*.wxss`.
- `components/`: reusable UI blocks (for example, `components/card`, `components/search-bar`).
- `custom-tab-bar/`: custom tab bar implementation.
- `utils/`: shared utilities and migration logic.
- `cloudfunctions/<name>/`: Tencent Cloud Functions; each function is deployed independently.
- `static/`: icons, templates, and image assets.

## Build, Test, and Development Commands
- `npm install`: install local dependencies (including `tdesign-miniprogram`).
- `npm test`: currently a placeholder and exits with error; do not rely on it for validation.
- `npx prettier --write .`: format tracked source files using repo Prettier config.
- In WeChat DevTools: open this folder, then run **Tools -> Build NPM** after dependency changes.

## Coding Style & Naming Conventions
- Use 2-space indentation for JS/WXML/WXSS and keep CommonJS style (`require`, `module.exports`) where existing.
- Prefer semicolons and keep functions/pages small and focused.
- Page/component folders use kebab-case (example: `pages/template-detail`).
- Cloud function folders use verb-first camelCase names (example: `getUserInfo`, `updateOfficialTemplate`).
- Reuse `utils/` helpers instead of duplicating request/storage logic.

## Testing Guidelines
Automated tests are not set up yet. Validate changes with targeted manual checks:

- Run affected flows in WeChat DevTools simulator and on at least one real-device preview.
- For cloud functions, verify input validation, permission checks, and success/error responses.
- For UI changes, confirm layout in both light content and long-list scenarios.

## Commit & Pull Request Guidelines
- Follow existing history style: short, action-oriented commit subjects (commonly Chinese), e.g. `修复模板详情页收藏状态同步`.
- Keep one logical change per commit; use version-only commits (for example `1.0.4`) only for release bumps.
- PRs should include: purpose, key changed paths, manual test steps, and screenshots/GIFs for UI updates.
- Link related issues/tasks and call out any cloud function deployment requirements.
