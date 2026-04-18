#!/usr/bin/env npx tsx
/**
 * Playwright browser helper for Claude Code.
 *
 * Usage:
 *   npx tsx scripts/playwright-browse.ts screenshot <url> [output_path]
 *   npx tsx scripts/playwright-browse.ts screenshot-full <url> [output_path]
 *   npx tsx scripts/playwright-browse.ts click <url> <selector> [output_path]
 *   npx tsx scripts/playwright-browse.ts fill <url> <selector> <value> [output_path]
 *   npx tsx scripts/playwright-browse.ts evaluate <url> <js_expression>
 *   npx tsx scripts/playwright-browse.ts list-links <url>
 *   npx tsx scripts/playwright-browse.ts list-elements <url> <selector>
 *   npx tsx scripts/playwright-browse.ts navigate <url> [actions_json]
 *   npx tsx scripts/playwright-browse.ts login [base_url]
 *   npx tsx scripts/playwright-browse.ts signup [base_url]
 *   npx tsx scripts/playwright-browse.ts signout [base_url]
 *   npx tsx scripts/playwright-browse.ts auth-screenshot [base_url] [path] [output_path]
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// @clerk/testing expects CLERK_PUBLISHABLE_KEY; Next.js stores it as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

const SCREENSHOTS_DIR = path.join(process.cwd(), ".context", "screenshots");
const STATE_PATH = path.join(process.cwd(), ".context", "playwright-state.json");

async function ensureDir(dir: string) {
  const fs = await import("fs");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function defaultScreenshotPath(): string {
  return path.join(SCREENSHOTS_DIR, `screenshot-${Date.now()}.png`);
}

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function createContext(
  browser: Browser,
  loadState = false,
): Promise<BrowserContext> {
  const fs = await import("fs");
  const viewportW = Number(process.env.PW_VIEWPORT_WIDTH) || 1280;
  const viewportH = Number(process.env.PW_VIEWPORT_HEIGHT) || 900;
  const opts: {
    viewport: { width: number; height: number };
    storageState?: string;
  } = {
    viewport: { width: viewportW, height: viewportH },
  };
  if (loadState && fs.existsSync(STATE_PATH)) {
    opts.storageState = STATE_PATH;
  }
  return browser.newContext(opts);
}

async function gotoPage(
  browser: Browser,
  url: string,
  loadState = false,
): Promise<Page> {
  const context = await createContext(browser, loadState);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  return page;
}

// ─── Auth commands ──────────────────────────────────────────────────────────

async function ensureClerkUser() {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!email || !password || !clerkSecret) {
    throw new Error(
      "E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and CLERK_SECRET_KEY must be set in .env.local",
    );
  }

  const createRes = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: true,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    const alreadyExists = err.errors?.some(
      (e: { code?: string; message?: string }) =>
        e.code === "form_identifier_exists" ||
        e.message?.includes("already been taken"),
    );
    if (!alreadyExists) {
      throw new Error(`Failed to create user: ${JSON.stringify(err)}`);
    }
    console.log("User already exists.");
  } else {
    console.log("User created.");
  }
}

async function login(baseUrl: string) {
  await ensureDir(SCREENSHOTS_DIR);
  await ensureClerkUser();
  await clerkSetup();

  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;

  const browser = await launchBrowser();
  try {
    const context = await createContext(browser);
    const page = await context.newPage();

    await setupClerkTestingToken({ page });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        identifier: email,
        password,
      },
    });

    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "login-signed-in.png"),
    });
    console.log(`Signed in, URL: ${page.url()}`);

    await ensureDir(path.dirname(STATE_PATH));
    await context.storageState({ path: STATE_PATH });
    console.log("Auth state saved.");
  } finally {
    await browser.close();
  }
}

async function signup(baseUrl: string) {
  // In this project signup == login: the Clerk Backend API creates the user,
  // then we sign in with the testing helper.
  await login(baseUrl);
}

async function signout(baseUrl: string) {
  await ensureDir(SCREENSHOTS_DIR);
  await clerkSetup();

  const browser = await launchBrowser();
  try {
    const context = await createContext(browser, true);
    const page = await context.newPage();

    await setupClerkTestingToken({ page });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await clerk.signOut({ page });

    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "signout.png"),
    });
    console.log(`Signed out, URL: ${page.url()}`);

    const fs = await import("fs");
    if (fs.existsSync(STATE_PATH)) {
      fs.unlinkSync(STATE_PATH);
      console.log("Cleared saved auth state.");
    }
  } finally {
    await browser.close();
  }
}

async function authScreenshot(
  baseUrl: string,
  urlPath: string,
  outputPath?: string,
) {
  await ensureDir(SCREENSHOTS_DIR);
  await ensureClerkUser();
  await clerkSetup();

  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;
  const outPath =
    outputPath ||
    path.join(
      SCREENSHOTS_DIR,
      `auth-${urlPath.replace(/\//g, "-").slice(1) || "home"}.png`,
    );

  const browser = await launchBrowser();
  try {
    const context = await createContext(browser);
    const page = await context.newPage();

    await setupClerkTestingToken({ page });
    await page.goto(`${baseUrl}/sign-in`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const testCode = process.env.E2E_TEST_CODE || "424242";
    const signInResult = await page.evaluate(
      async ({ email, password, testCode }) => {
        const w = window as unknown as {
          Clerk?: {
            client?: {
              signIn: {
                create: (p: unknown) => Promise<SignInResource>;
              };
            };
            setActive: (p: { session: string }) => Promise<void>;
          };
        };
        type SignInResource = {
          status: string;
          createdSessionId?: string;
          supportedSecondFactors?: { strategy: string }[];
          prepareSecondFactor: (p: unknown) => Promise<unknown>;
          attemptSecondFactor: (p: unknown) => Promise<SignInResource>;
        };
        while (!w.Clerk?.client) {
          await new Promise((r) => setTimeout(r, 200));
        }
        let res = await w.Clerk.client.signIn.create({
          identifier: email,
          password,
        });
        if (res.status === "needs_second_factor") {
          const strategies = (res.supportedSecondFactors || []).map(
            (f) => f.strategy,
          );
          const strat = strategies.includes("email_code")
            ? "email_code"
            : strategies.includes("phone_code")
              ? "phone_code"
              : null;
          if (!strat)
            return { success: false, status: "unsupported_second_factor", strategies };
          await res.prepareSecondFactor({ strategy: strat });
          res = await res.attemptSecondFactor({ strategy: strat, code: testCode });
        }
        if (res.status === "complete" && res.createdSessionId) {
          await w.Clerk.setActive({ session: res.createdSessionId });
          return { success: true };
        }
        return { success: false, status: res.status };
      },
      { email, password, testCode },
    );
    console.log("signIn:", signInResult);
    if (!signInResult.success) throw new Error("Sign-in failed");
    await page.waitForTimeout(2000);

    await page.goto(`${baseUrl}${urlPath}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Authenticated screenshot: ${outPath} (URL: ${page.url()})`);
  } finally {
    await browser.close();
  }
}

// ─── Generic browser commands ───────────────────────────────────────────────

async function screenshot(url: string, outputPath?: string, fullPage = false) {
  await ensureDir(SCREENSHOTS_DIR);
  const outPath = outputPath || defaultScreenshotPath();
  const browser = await launchBrowser();
  try {
    const page = await gotoPage(browser, url);
    await page.screenshot({ path: outPath, fullPage });
    console.log(`Screenshot saved: ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function clickAndScreenshot(
  url: string,
  selector: string,
  outputPath?: string,
) {
  await ensureDir(SCREENSHOTS_DIR);
  const outPath = outputPath || defaultScreenshotPath();
  const browser = await launchBrowser();
  try {
    const page = await gotoPage(browser, url);
    await page.click(selector);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: outPath });
    console.log(`Clicked "${selector}" and saved: ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function fillAndScreenshot(
  url: string,
  selector: string,
  value: string,
  outputPath?: string,
) {
  await ensureDir(SCREENSHOTS_DIR);
  const outPath = outputPath || defaultScreenshotPath();
  const browser = await launchBrowser();
  try {
    const page = await gotoPage(browser, url);
    await page.fill(selector, value);
    await page.screenshot({ path: outPath });
    console.log(`Filled "${selector}" and saved: ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function evaluate(url: string, expression: string) {
  const browser = await launchBrowser();
  try {
    const page = await gotoPage(browser, url);
    const result = await page.evaluate(expression);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

async function listLinks(url: string) {
  const browser = await launchBrowser();
  try {
    const page = await gotoPage(browser, url);
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        text: (a as HTMLAnchorElement).textContent?.trim(),
        href: (a as HTMLAnchorElement).href,
      })),
    );
    console.log(JSON.stringify(links, null, 2));
  } finally {
    await browser.close();
  }
}

async function listElements(url: string, selector: string) {
  const browser = await launchBrowser();
  try {
    const page = await gotoPage(browser, url);
    const elements = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 100),
        id: el.id || undefined,
        class: el.className || undefined,
        href: (el as HTMLAnchorElement).href || undefined,
      }));
    }, selector);
    console.log(JSON.stringify(elements, null, 2));
  } finally {
    await browser.close();
  }
}

type NavAction =
  | { action: "click"; selector: string }
  | { action: "fill"; selector: string; value: string }
  | { action: "screenshot"; path?: string }
  | { action: "wait"; ms: number }
  | { action: "evaluate"; expression: string }
  | { action: "scroll"; direction?: "down" | "up"; amount?: number };

async function navigate(url: string, actionsJson?: string) {
  await ensureDir(SCREENSHOTS_DIR);
  const browser = await launchBrowser();
  try {
    const page = await gotoPage(browser, url);

    if (!actionsJson) {
      const outPath = defaultScreenshotPath();
      await page.screenshot({ path: outPath });
      console.log(`Navigated to ${url}. Screenshot: ${outPath}`);
      return;
    }

    const actions: NavAction[] = JSON.parse(actionsJson);
    for (let i = 0; i < actions.length; i++) {
      const step = actions[i];
      switch (step.action) {
        case "click":
          await page.click(step.selector);
          await page.waitForLoadState("networkidle").catch(() => {});
          console.log(`Step ${i + 1}: clicked "${step.selector}"`);
          break;
        case "fill":
          await page.fill(step.selector, step.value);
          console.log(
            `Step ${i + 1}: filled "${step.selector}" with "${step.value}"`,
          );
          break;
        case "screenshot": {
          const p = step.path || defaultScreenshotPath();
          await page.screenshot({ path: p });
          console.log(`Step ${i + 1}: screenshot saved to ${p}`);
          break;
        }
        case "wait":
          await page.waitForTimeout(step.ms);
          console.log(`Step ${i + 1}: waited ${step.ms}ms`);
          break;
        case "evaluate": {
          const result = await page.evaluate(step.expression);
          console.log(
            `Step ${i + 1}: evaluate result:`,
            JSON.stringify(result, null, 2),
          );
          break;
        }
        case "scroll": {
          const amount = step.amount || 500;
          const dir = step.direction === "up" ? -amount : amount;
          await page.evaluate((y) => window.scrollBy(0, y), dir);
          console.log(
            `Step ${i + 1}: scrolled ${step.direction || "down"} ${amount}px`,
          );
          break;
        }
      }
    }
  } finally {
    await browser.close();
  }
}

// ─── CLI dispatcher ─────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

(async () => {
  try {
    switch (command) {
      case "screenshot":
        await screenshot(args[0], args[1], false);
        break;
      case "screenshot-full":
        await screenshot(args[0], args[1], true);
        break;
      case "click":
        await clickAndScreenshot(args[0], args[1], args[2]);
        break;
      case "fill":
        await fillAndScreenshot(args[0], args[1], args[2], args[3]);
        break;
      case "evaluate":
        await evaluate(args[0], args[1]);
        break;
      case "list-links":
        await listLinks(args[0]);
        break;
      case "list-elements":
        await listElements(args[0], args[1]);
        break;
      case "navigate":
        await navigate(args[0], args[1]);
        break;
      case "login":
        await login(args[0] || "http://localhost:3000");
        break;
      case "signup":
        await signup(args[0] || "http://localhost:3000");
        break;
      case "signout":
        await signout(args[0] || "http://localhost:3000");
        break;
      case "auth-screenshot":
        await authScreenshot(
          args[0] || "http://localhost:3000",
          args[1] || "/",
          args[2],
        );
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error(
          "Commands: screenshot, screenshot-full, click, fill, evaluate, list-links, list-elements, navigate, login, signup, signout, auth-screenshot",
        );
        process.exit(1);
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
