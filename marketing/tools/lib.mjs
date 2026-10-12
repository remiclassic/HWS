import fs from "node:fs";
import puppeteer from "puppeteer-core";
export const BASE = "http://localhost:8081";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function open({ w = 390, h = 844, dsf = 2 } = {}) {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dsf, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem("hotwheels_onboarding_complete", "1"); } catch {}
  });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
  return { browser, page };
}
export async function login(page) {
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 240000 });
  await sleep(2500);
  if (page.url().includes("/login")) {
    const inputs = await page.$$("input");
    const vals = await Promise.all(inputs.map((i) => i.evaluate((e) => e.value)));
    const sql = fs.readFileSync("C:/Users/Remi Couture/Documents/hotwheels/marketing/tools/demo-state.sql", "utf8");
    const [, em, pw] = sql.match(/Showcase login \(local only\): (\S+) \/ (\S+)/);
    for (const [i, v] of [[inputs[0], em], [inputs[1], pw]]) { await i.click({ clickCount: 3 }); await page.keyboard.press("Backspace"); await i.type(v); }
    const bs = await page.$$("xpath/.//*[text()='Sign in']"); const btn = bs[bs.length - 1];
    await btn.click();
    await page.waitForFunction(() => !location.pathname.includes("login"), { timeout: 30000 });
    await sleep(3000);
  }
}
export async function go(page, path, wait = 2500) {
  await page.evaluate((p) => { window.history.pushState({}, "", p); window.dispatchEvent(new PopStateEvent("popstate")); }, path);
  await sleep(wait);
}
