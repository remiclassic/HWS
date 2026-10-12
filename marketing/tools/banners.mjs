import puppeteer from "puppeteer-core";
import { pathToFileURL } from "node:url";
const M = "C:/Users/Remi Couture/Documents/hotwheels/marketing/";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
for (const [name, w, h] of [["feature-graphic-1024x500", 1024, 500], ["social-card-1200x630", 1200, 630]]) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(M + "tools/banner.html").href, { waitUntil: "networkidle0" });
  await page.screenshot({ path: M + "banners/" + name + ".png" });
}
await browser.close();
