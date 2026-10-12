import puppeteer from "puppeteer-core";
import { pathToFileURL } from "node:url";
const M = "C:/Users/Remi Couture/Documents/hotwheels/marketing/";
const shots = [
  ["01-browse", "01-browse.png", "Find", "Spot it <em>before</em> it leaves the pegs", "#FF7A1A"],
  ["02-treasure-hunt", "05-treasure-hunt-guide.png", "Decode", "Know a <em>Treasure Hunt</em> on sight", "#FFD400"],
  ["03-garage", "02-garage.png", "Collect", "Your whole garage, <em>in your pocket</em>", "#3B9BFF"],
  ["04-car-detail", "03-car-detail-sth.png", "Verify", "Real specs. <em>Rumors</em> labelled as rumors.", "#FF7A1A"],
  ["05-race", "10-race.jpg", "Play", "Race the cars <em>you actually own</em>", "#FFD400"],
  ["06-progress", "06-collector-progress.png", "Level up", "Streaks, badges and a <em>leaderboard</em>", "#3B9BFF"],
];
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1290, height: 2796, deviceScaleFactor: 1 });
for (const [name, img, k, t, accent] of shots) {
  const u = pathToFileURL(M + "tools/shot.html");
  u.search = new URLSearchParams({ k, t, accent, img: pathToFileURL(M + "screenshots/raw/" + img).href }).toString();
  await page.goto(u.href, { waitUntil: "networkidle0" });
  await page.screenshot({ path: M + "screenshots/store/" + name + ".png" });
  console.log("ok", name);
}
await browser.close();
