---
name: playwright
description: Browse the site, take screenshots, click elements, fill forms, and inspect the DOM using Playwright
triggers:
  - screenshot
  - browse
  - visual check
  - walk through the site
  - playwright
  - inspect page
  - check the UI
---

# Playwright Browser Skill

Use Playwright to browse the running site, take screenshots, interact with elements, and inspect the DOM.

## Prerequisites

The dev server must be running. The app runs on `http://localhost:3000` by default.

## Script Location

`scripts/playwright-browse.ts` — run with `npx tsx scripts/playwright-browse.ts`.

## Commands

### Take a screenshot

```bash
npx tsx scripts/playwright-browse.ts screenshot http://localhost:3000
npx tsx scripts/playwright-browse.ts screenshot http://localhost:3000 .context/screenshots/home.png
```

### Full-page screenshot

```bash
npx tsx scripts/playwright-browse.ts screenshot-full http://localhost:3000
```

### Click an element and screenshot the result

```bash
npx tsx scripts/playwright-browse.ts click http://localhost:3000 "button.sign-in"
```

### Fill a form field and screenshot

```bash
npx tsx scripts/playwright-browse.ts fill http://localhost:3000 "input[name=email]" "test@example.com"
```

### Evaluate JavaScript on the page

```bash
npx tsx scripts/playwright-browse.ts evaluate http://localhost:3000 "document.title"
```

### List all links on a page

```bash
npx tsx scripts/playwright-browse.ts list-links http://localhost:3000
```

### List elements matching a selector

```bash
npx tsx scripts/playwright-browse.ts list-elements http://localhost:3000 "button"
```

### Multi-step navigation (walk through the site)

Pass a JSON array of actions to perform sequentially:

```bash
npx tsx scripts/playwright-browse.ts navigate http://localhost:3000 '[
  {"action":"screenshot","path":".context/screenshots/step1-home.png"},
  {"action":"click","selector":"a[href=\"/map\"]"},
  {"action":"wait","ms":1000},
  {"action":"screenshot","path":".context/screenshots/step2-map.png"},
  {"action":"scroll","direction":"down","amount":500},
  {"action":"screenshot","path":".context/screenshots/step3-scrolled.png"}
]'
```

### Available navigate actions

| Action       | Parameters                           | Description               |
| ------------ | ------------------------------------ | ------------------------- |
| `click`      | `selector`                           | Click an element          |
| `fill`       | `selector`, `value`                  | Type into an input        |
| `screenshot` | `path` (optional)                    | Capture current state     |
| `wait`       | `ms`                                 | Wait for milliseconds     |
| `evaluate`   | `expression`                         | Run JS and log the result |
| `scroll`     | `direction` (up/down), `amount` (px) | Scroll the page           |

## Screenshots

All screenshots default to `.context/screenshots/` (gitignored). Use the `Read` tool to view them — Claude Code can read images natively.

## Tips

- Always take a screenshot after interactions to verify the result visually.
- Use `list-elements` to discover selectors before clicking or filling.
- Use `list-links` to discover navigation targets.
- For authenticated pages, you may need to set cookies or use Clerk test tokens.
- The viewport is 1280x900 by default.
