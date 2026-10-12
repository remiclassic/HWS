# Spotter — pre-launch marketing kit

Everything here was generated from the real app running against the local Supabase stack
with a fictional demo account. Nothing is mocked up in a design tool: the screens are the screens.

## What's in the folder

| Path | What | Size / spec |
|---|---|---|
| `screenshots/store/01…06-*.png` | Captioned, device-framed store screenshots | 1290×2796 (App Store 6.7", also accepted by Google Play) |
| `screenshots/raw/*` | Clean app captures, no frame or caption | 1290×2796, plus two tall captures used for video pans |
| `promo/spotter-promo-1080x1920.mp4` | Motion-graphics promo, vertical | 24 s, 30 fps, H.264, original music (−13 LUFS) |
| `promo/spotter-promo-preview.gif` | Low-res preview of the promo for chat / README embeds | 270 px wide |
| `banners/feature-graphic-1024x500.png` | Google Play feature graphic | 1024×500 |
| `banners/social-card-1200x630.png` | Link preview / Open Graph card | 1200×630 |
| `site/` | Waitlist landing page, live at <https://remiclassic.github.io/HWS/> | static HTML/CSS/JS, about 6 MB |
| `tools/` | HTML templates and scripts that produced all of the above | see "Regenerating" |

## Before any of this goes public

These are blockers or near-blockers, in order of seriousness.

1. **Trademark.** The app name, the header art (a "Hot Wheels" sign is baked into
   `header-scene.png`) and several car renders carry Mattel's marks. Both stores reject or pull
   listings that use another company's trademark in the name, icon or screenshots without a
   licence. The kit leads with the **Spotter** wordmark for that reason, but screenshot 01, the
   promo's browse scene and both banners still show the sign because it is in the app. Decide
   between a licence, or a rename plus new header art, before submitting. Copy below uses
   "die-cast" and says "Hot Wheels®" only descriptively.
2. **App icon is still the Expo placeholder** (`apps/mobile/assets/icon.png`). There is no icon
   in this kit because there isn't one to show yet.
3. **Demo data is fictional.** Case codes, SKUs, sources and rumors come from `seed_demo.sql`,
   which says so itself. Fine for screenshots; don't quote any of it as fact in posts.
4. **Don't promise want-list alerts yet.** The settings toggle exists, but push fan-out is still
   on the outstanding list. The copy below leaves it out.
5. **The Spotter logo is a 476 px crop** from the header image, enlarged. It is soft at banner
   size. A vector or high-res export would sharpen every asset here.
6. **The promo's music is synthesized, not composed by a musician.** `tools/make-music.py`
   generates an original 150 BPM electronic track timed to the cuts (3.2, 7.0, 10.6, 14.0, 18.6
   and 21.2 s), so there is nothing to license. It is serviceable, not a hit; swap in a
   licensed track if you want more polish.

## Positioning

**One line:** The pocket field guide for die-cast hunters.

**Who it's for:** people who check the pegs every time they pass the toy aisle, from kids with a
shoebox of loose cars to collectors chasing Super Treasure Hunts.

**The problem:** you are standing in a store with thirty seconds and a full peg. Is this one a
Treasure Hunt? Do I already own it? Collector knowledge lives in forum threads and memory.

**What Spotter does about it:**

- **Find** — search the catalog by casting, series, SKU or barcode. Scan a card with the camera.
- **Decode** — a Treasure Hunt field guide per casting: the markers to check, in plain language.
- **Verify** — every spec shows where it came from and how confident the match is. Rumors are
  labelled as rumors.
- **Collect** — owned, wanted and duplicates, with condition, quantity, notes and your own photos.
- **Play** — race the cars in your garage on a toy-track circuit.
- **Level up** — XP, streaks, achievements, an opt-in leaderboard and a public collector profile.

**Taglines**

- Find it. Collect it. Race it. *(primary; used in the promo and banners)*
- Spot it before it leaves the pegs.
- Know a Treasure Hunt on sight.
- Your whole garage, in your pocket.

## Store listing copy

**Name (30 max):** `Spotter: Die-Cast Collector` (27)

**Subtitle (30 max):** `Find, collect and race` (22)

**Google Play short description (80 max):**
`Spot Treasure Hunts, track your die-cast garage, and race the cars you own.` (75)

**Keywords (App Store, 100 max):**
`diecast,collector,treasure hunt,garage,toy cars,barcode,scanner,collection,tracker,1:64,race` (92)

**Full description**

> You're at the pegs. You have thirty seconds. Is that gold hot rod the Treasure Hunt, or the
> regular one that shipped in the same case?
>
> Spotter is a field guide and garage for die-cast collectors.
>
> FIND IT
> Search by casting name, series, SKU or UPC, or scan the barcode on the card. Filter by line and
> by hunt type to see what's worth a second look.
>
> KNOW WHAT YOU'RE HOLDING
> Every Treasure Hunt and Super Treasure Hunt comes with a field guide: the logo to look for, the
> wheels, the paint, the card. A short checklist you can run through in the aisle.
>
> TRUST THE DATA
> Each spec shows its source and a confidence score. Official sheets are marked official.
> Community reports are marked community. Rumors are marked rumors.
>
> BUILD YOUR GARAGE
> Mark cars as owned, wanted or duplicate. Track carded, loose and custom. Add quantities, notes
> and your own photos. See your collection broken down by line and year, and export it any time.
>
> RACE WHAT YOU OWN
> Pick a car from your garage and take it round the Garage Grand Prix: three loops, two jumps
> and a chicane, against three rivals from your own collection.
>
> LEVEL UP
> Earn XP for scans and milestones, keep a daily streak, unlock achievements, and join the
> leaderboard if you want to. Your profile is private until you opt in.
>
> Spotter is an independent collector tool and is not affiliated with or endorsed by Mattel.
> Hot Wheels® is a trademark of Mattel, Inc.

## Screenshot set

Upload in this order. The first two do most of the work, since they are what shows in search.

| # | File | Kicker | Headline |
|---|---|---|---|
| 1 | `01-browse.png` | Find | Spot it before it leaves the pegs |
| 2 | `02-treasure-hunt.png` | Decode | Know a Treasure Hunt on sight |
| 3 | `03-garage.png` | Collect | Your whole garage, in your pocket |
| 4 | `04-car-detail.png` | Verify | Real specs. Rumors labelled as rumors. |
| 5 | `05-race.png` | Play | Race the cars you actually own |
| 6 | `06-progress.png` | Level up | Streaks, badges and a leaderboard |

Not included: the barcode scanner. On web it falls back to a text box, so there is no honest
capture of the camera view. Grab that one from a phone build and add it as slot 2 or 3.

## Promo video

`promo/spotter-promo-1080x1920.mp4` — vertical, for Reels, Shorts, TikTok and store preview slots.

| Time | Scene | On screen |
|---|---|---|
| 0.0–3.2 | Open | Cars streak along an orange track, Spotter logo lands, "The pocket field guide for die-cast hunters" |
| 3.2–7.0 | Find | Catalog scrolls in the phone. "Spot it before it leaves the pegs" |
| 7.0–10.6 | Decode | Treasure Hunt guide, TH and STH badges pop, gold hot rod rolls in |
| 10.6–14.0 | Collect | Garage screen, counters tick up to 11 owned / 4 wanted / 3 hunts |
| 14.0–18.6 | Play | Real race footage, sped up about 2×, into the loop |
| 18.6–21.2 | Level up | Progress and leaderboard phones slide in |
| 21.2–24.0 | Close | "Find it. Collect it. Race it." → Join the waitlist → Coming soon · iOS & Android |

The race footage is a real capture of the game with the throttle held, not an animation.

## Getting wishlists

Mobile stores don't have a Steam-style wishlist. The equivalents:

- **Google Play pre-registration.** Create the listing, upload these assets, turn on
  pre-registration. Users get a notification on launch day.
- **App Store pre-order.** Same idea; the app downloads automatically on release. Requires a
  build that has passed review.
- **Your own waitlist.** An email form on a one-page site. Worth having in addition to the
  stores, because it is the only list you own and can message before launch.

Check each store's current lead-time limits and preview-video specs when you set these up.

The promo ends on "Join the waitlist" with no URL, so it works for any of the three. Put the
link in the post caption or bio.

**Where collectors already are:** r/HotWheels and r/Diecast (read each sub's self-promo rules
first), Facebook collector groups, Instagram and TikTok under #diecast #pegwarmers
#treasurehunt #supertreasurehunt, and collector Discords.

### Launch posts

**Short (X / Threads / Bluesky)**

> Standing at the pegs wondering if that's the Treasure Hunt or the regular?
>
> Spotter is a field guide + garage for die-cast collectors. Scan it, check the markers, log it,
> then race it.
>
> Coming soon to iOS and Android. Waitlist: [link]

**Instagram / TikTok caption**

> Find it. Collect it. Race it. 🏁
>
> Spotter tells you what you're holding before you leave the aisle: Treasure Hunt markers,
> sources you can check, and a garage that knows what you already own. Then it lets you race them.
>
> Waitlist link in bio.
> #diecast #diecastcollector #treasurehunt #supertreasurehunt #164scale #toycars

**Reddit / forum (written as a person, not an ad)**

> I got tired of standing in the toy aisle googling whether a car was a TH, so I built an app.
>
> It has a catalog you can search or scan, a checklist of TH/STH markers per casting, and a
> garage for owned / wanted / dupes. Every spec shows its source and rumors are labelled as
> rumors, because I've been burned by "confirmed" forum posts. There's also a small racing game
> that uses the cars you've logged.
>
> It's not out yet. I'm looking for collectors to tell me what's wrong with it. Waitlist here:
> [link]. Happy to answer anything.

## Waitlist site

`site/` is a static page (no build step) published from the `gh-pages` branch, which holds only
the contents of that folder. Preview locally with the `marketing-site` launch config
(<http://localhost:8090>); on localhost the form talks to the local Supabase stack.

Signups are written straight to `public.waitlist_signups` with a publishable anon key. RLS
allows insert only: visitors cannot read the list, only admins can. The table comes from
`supabase/migrations/20261012000000_waitlist_signups.sql`.

**The live form does not collect emails yet.** There is no hosted Supabase project to send them
to: the URL in `apps/mobile/.env.production.example` does not resolve, and the CLI is not linked
to a project. Until that exists, the live form answers "The waitlist isn't connected yet". To
switch it on:

1. Create (or restore) the hosted project and `npx supabase link` to it.
2. `npx supabase db push` to apply the migrations, including the waitlist table.
3. Put the project URL and publishable key in the production line of `site/config.js`.
4. Republish the site.

Read signups in the Supabase dashboard, or with
`select email, platform, source, created_at from waitlist_signups order by created_at`.

To republish after editing `site/`:

```bash
git subtree split --prefix marketing/site -b gh-pages-next
```

only works once `marketing/site` is committed on main. Until then, copy the folder into a fresh
clone of the `gh-pages` branch, commit and push.

## Regenerating

The scripts need `puppeteer-core` (not a project dependency), Chrome, and `ffmpeg` on PATH.
Paths inside the scripts are absolute to this machine.

```bash
cd marketing/tools && npm i --no-save puppeteer-core@23
```

1. `npm run db:start`, then load the demo account:
   `docker exec -i supabase_db_HWS psql -U postgres < marketing/tools/demo-state.sql`
2. `npm run dev` (app on :8081)
3. `node capture.mjs` → `screenshots/raw/`
4. `node store.mjs` → `screenshots/store/` (captions live in this file)
5. `node banners.mjs` → `banners/`
6. `node render-promo.mjs assets/race` → `promo/` (timing and copy live in `promo.html`; open
   that file in a browser to preview it live, or add `?t=12.5` to freeze a frame)

To change the music, edit `make-music.py`, run `python make-music.py ../promo/spotter-promo-music.wav`,
then mux it over the video with ffmpeg (`-map 0:v -map 1:a -c:v copy -af volume=-5.5dB`). Note that
`render-promo.mjs` writes a silent video, so re-mux after every re-render.

`race.mjs` re-records the race clip; crop and resize its frames to 600 px wide, named
`r001.jpg`…`r118.jpg`, before replacing `tools/assets/race/`.

To remove the demo users from the local database:

```bash
docker exec supabase_db_HWS psql -U postgres -c "delete from auth.users where email like '%@marketing.hotwheels.local'"
```
