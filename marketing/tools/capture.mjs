import { open, login, sleep, BASE } from "./lib.mjs";
const OUT = "C:/Users/Remi Couture/Documents/hotwheels/marketing/screenshots/raw/";
const { browser, page } = await open({ w: 430, h: 932, dsf: 3 });
await login(page);
const shot = async (name) => { await page.screenshot({ path: OUT + name + ".png" }); console.log("ok", name); };
const nav = async (r, wait = 3000) => { await page.goto(BASE + r, { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}); await sleep(wait); };
const BS = "c0000000-0000-0000-0000-000000000002", CH = "c0000000-0000-0000-0000-000000000006";
await nav("/"); await shot("01-browse");
await nav("/garage"); await shot("02-garage");
await nav("/car/" + CH); await shot("03-car-detail-sth");
await nav("/car/" + BS); await shot("04-car-detail-th");
await nav("/th/" + BS); await shot("05-treasure-hunt-guide");
await nav("/collector-progress"); await shot("06-collector-progress");
await nav("/leaderboard"); await shot("07-leaderboard");
await nav("/garage-insights"); await shot("08-garage-insights");
await nav("/race"); await shot("09-race-select");
const bs = await page.$$("xpath/.//*[starts-with(text(),'Race ')]");
console.log("race btns", bs.length);
if (bs.length) { await bs[bs.length - 1].click(); for (const t of [3, 6, 10, 15]) { await sleep(t === 3 ? 3000 : 3500); await shot("10-race-t" + t); } }
// tall captures for video pans
await page.setViewport({ width: 430, height: 2300, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await nav("/"); await shot("tall-browse");
await page.setViewport({ width: 430, height: 3400, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await nav("/car/" + BS); await shot("tall-car-detail");
await browser.close();
