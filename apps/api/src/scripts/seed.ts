import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import {
  canonicalCars,
  carCommunityNotes,
  carImages,
  carSourceAttributions,
  carVariations,
  sourceRegistry,
} from "../db/schema.js";

async function ensureSource(
  name: string,
  type: "official" | "community",
  trustWeight: number,
  baseUrl: string | null,
) {
  const existing = await db.select().from(sourceRegistry).where(eq(sourceRegistry.name, name)).limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await db
    .insert(sourceRegistry)
    .values({ name, type, trustWeight, baseUrl })
    .returning({ id: sourceRegistry.id });
  if (!row) throw new Error("source insert failed");
  return row.id;
}

async function main() {
  const mattel = await ensureSource("Mattel / Hot Wheels (official listing)", "official", 1, "https://hotwheels.mattel.com");
  const creations = await ensureSource("Mattel Creations", "official", 1, "https://creations.mattel.com");
  const reddit = await ensureSource("r/HotWheels (community, unverified)", "community", 0.45, "https://reddit.com/r/HotWheels");

  const cars: {
    casting: string;
    year: number;
    series: string;
    line: "Mainline" | "Premium" | "RLC" | "TeamTransport" | "Entertainment" | "Other";
    th: "None" | "TH" | "STH";
    desc: string;
    model?: string;
    sourceId: string;
    variations: { wheels: string; deco: string; region: string | null; notes: string | null }[];
    rumor?: boolean;
  }[] = [
    {
      casting: "Twin Mill",
      year: 2024,
      series: "HW Dream Garage",
      line: "Mainline",
      th: "TH",
      desc: "Iconic twin-engine fantasy casting often used for special finishes.",
      model: "HCT50",
      sourceId: mattel,
      variations: [
        {
          wheels: "5-spoke",
          deco: "Metalflake blue",
          region: "US",
          notes: "Standard mainline release",
        },
      ],
    },
    {
      casting: "'70 Dodge Charger",
      year: 2024,
      series: "Muscle Mania",
      line: "Mainline",
      th: "STH",
      desc: "Super Treasure Hunt variant typically features Real Riders and spectraflame-style paint.",
      sourceId: mattel,
      variations: [
        {
          wheels: "Real Riders Deep Dish",
          deco: "Spectraflame green",
          region: "US",
          notes: "STH wheel/type combo",
        },
        {
          wheels: "Basic",
          deco: "Solid green",
          region: "US",
          notes: "Non-STH mainline",
        },
      ],
    },
    {
      casting: "Bone Shaker",
      year: 2023,
      series: "RLC Exclusive",
      line: "RLC",
      th: "None",
      desc: "Red Line Club exclusive — not a mainline TH/STH; collectible for RLC members.",
      sourceId: creations,
      variations: [
        {
          wheels: "Real Riders",
          deco: "RLC deco",
          region: "INTL",
          notes: "Sold via Mattel Creations",
        },
      ],
    },
    {
      casting: "Custom '77 Dodge Van",
      year: 2025,
      series: "Mystery",
      line: "Mainline",
      th: "None",
      desc: "Placeholder row for filter/search demos.",
      model: "TBD-001",
      sourceId: reddit,
      variations: [],
      rumor: true,
    },
  ];

  for (const c of cars) {
    const existing = await db
      .select({ id: canonicalCars.id })
      .from(canonicalCars)
      .where(eq(canonicalCars.castingName, c.casting))
      .limit(1);

    let carId: string;
    if (existing[0]) {
      carId = existing[0].id;
      await db
        .update(canonicalCars)
        .set({
          year: c.year,
          series: c.series,
          lineType: c.line,
          treasureHuntType: c.th,
          description: c.desc,
          modelNumber: c.model ?? null,
          lastVerifiedAt: new Date(),
        })
        .where(eq(canonicalCars.id, carId));
    } else {
      const [ins] = await db
        .insert(canonicalCars)
        .values({
          castingName: c.casting,
          year: c.year,
          series: c.series,
          lineType: c.line,
          treasureHuntType: c.th,
          description: c.desc,
          modelNumber: c.model ?? null,
          lastVerifiedAt: new Date(),
        })
        .returning({ id: canonicalCars.id });
      if (!ins) continue;
      carId = ins.id;
    }

    await db.delete(carVariations).where(eq(carVariations.carId, carId));
    if (c.variations.length) {
      await db.insert(carVariations).values(
        c.variations.map((v) => ({
          carId,
          wheels: v.wheels,
          deco: v.deco,
          region: v.region,
          notes: v.notes,
        })),
      );
    }

    await db.delete(carSourceAttributions).where(eq(carSourceAttributions.carId, carId));
    await db.insert(carSourceAttributions).values([
      {
        carId,
        fieldPath: "treasure_hunt_type",
        value: c.th,
        sourceId: c.sourceId,
        confidenceScore: c.rumor ? 0.4 : 0.95,
        isRumor: !!c.rumor,
        citedUrl: null,
      },
      ...(c.th !== "None"
        ? [
            {
              carId,
              fieldPath: "treasure_hunt_markers",
              value:
                c.th === "TH"
                  ? "Flame logo / TH card callout (verify on sealed card)."
                  : "Upgraded wheels and premium paint; verify against packaging.",
              sourceId: c.sourceId,
              confidenceScore: c.rumor ? 0.35 : 0.9,
              isRumor: !!c.rumor,
              citedUrl: null,
            },
          ]
        : []),
    ]);

    await db.delete(carImages).where(eq(carImages.carId, carId));
    await db.insert(carImages).values({
      carId,
      officialImageUrl: `https://via.placeholder.com/400x220?text=${encodeURIComponent(c.casting)}`,
      sourceId: c.sourceId,
      attributionNote: "Placeholder image — replace with permitted official artwork",
    });

    await db.delete(carCommunityNotes).where(eq(carCommunityNotes.carId, carId));
    if (c.rumor) {
      await db.insert(carCommunityNotes).values({
        carId,
        body: "Community-sourced placeholder note — treat as non-official until verified.",
        sourceId: reddit,
      });
    }
  }

  console.log("Seed complete.");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
