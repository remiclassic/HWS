import fs from "node:fs";
import { open, login, sleep, BASE } from "./lib.mjs";
const { browser, page } = await open({ w: 430, h: 932, dsf: 2 });
await login(page);
await page.goto(BASE + "/race", { waitUntil: "networkidle2" }); await sleep(3000);
const bs = await page.$$("xpath/.//*[starts-with(text(),'Race ')]");
await bs[bs.length - 1].click();
await sleep(2500);
fs.mkdirSync("race", { recursive: true });
await page.keyboard.down("ArrowUp");
const t0 = Date.now(); let n = 0; const times = [];
while (Date.now() - t0 < 22000) {
  await page.screenshot({ path: `race/f${String(n).padStart(4, "0")}.jpg`, type: "jpeg", quality: 88 });
  times.push(Date.now() - t0); n++;
}
fs.writeFileSync("race/times.json", JSON.stringify(times));
console.log("frames", n, "fps", (n / 22).toFixed(1));
await browser.close();
