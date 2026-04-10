import type { TreasureHuntType } from "@hotwheels/shared";

export function buildThExplanation(
  treasureHuntType: TreasureHuntType,
  castingName: string,
  markersFromAttributions: string[],
): { summary: string; markers: string[] } | null {
  if (treasureHuntType === "None") return null;

  const base =
    treasureHuntType === "TH"
      ? `Treasure Hunt (TH): ${castingName} is listed as a mainline Treasure Hunt for this release. Look for the flame-ring circle logo and “Treasure Hunt” on the card.`
      : `Super Treasure Hunt (STH): ${castingName} is listed as a Super — typically real riders / premium wheels, often $TH on the card, and distinct paint/wheel combo vs the regular mainline.`;

  const markers = [
    ...markersFromAttributions,
    treasureHuntType === "TH"
      ? "Card: Treasure Hunt callout or flame logo (varies by year)."
      : "Wheels: Often Real Riders or upgraded wheel type vs standard mainline.",
    treasureHuntType === "STH" ? "Paint: Often spectraflame or premium finish vs base mainline." : "Production: Lower run than standard mainline.",
  ];

  return { summary: base, markers };
}
