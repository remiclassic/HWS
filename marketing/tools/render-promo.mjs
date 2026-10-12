// Renders marketing/tools/promo.html to MP4. Usage: node render-promo.mjs <raceFramesDir> [--stills]
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
const M = "C:/Users/Remi Couture/Documents/hotwheels/marketing/";
const raceDir = path.resolve(process.argv[2]);
const stills = process.argv.includes("--stills");
const FPS = 30, DUR = 24;
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e)));
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const u = pathToFileURL(M + "tools/promo.html"); u.search = new URLSearchParams({ render: "1", race: pathToFileURL(raceDir).href }).toString();
await page.goto(u.href, { waitUntil: "networkidle0" });
await page.evaluate(() => window.ready);
if (stills) {
  for (const t of [0.9, 2.4, 3.25, 5.2, 9.4, 12.8, 16.5, 20.3, 23.2]) {
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: `out/p_${String(t).replace(".", "_")}.jpg`, type: "jpeg", quality: 80 });
  }
} else {
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k",
    M + "promo/spotter-promo-1080x1920.mp4"], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = 0; f < FPS * DUR; f++) {
    await page.evaluate((t) => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 120 === 0) console.log("frame", f);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
}
await browser.close();
