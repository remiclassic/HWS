/**
 * How each casting is built in the race: body style, paint and the details that make
 * it recognisable (stripes, blower, wing…). Colours are matched to the studio art in
 * `assets/spotter/cars`; castings without an entry get a plain body guessed from the name.
 */
export type CarBody = "coupe" | "muscle" | "wedge" | "hotrod" | "pickup" | "van" | "bus";

/** Roofline behind the doors: three-box, long sloping glass, or a squared-off hatch. */
export type CarTail = "notch" | "fastback" | "hatch";

export type CarLook = {
  body: CarBody;
  paint: string;
  /** Second colour: lower body on two-tones, frame on the hot rod, face on the bus, boards on the Deora. */
  trim?: string;
  /** Twin racing stripes over hood, roof and deck. */
  stripes?: string;
  /** Flames along the flanks. */
  sideFlash?: string;
  /** Straight pinstripe band along the flanks. */
  sideStripe?: string;
  /** Bumblebee band wrapped over the rear quarters. */
  tailBand?: string;
  /** Hood painted apart from the body. */
  hood?: string;
  /** Race-number disc on the doors. */
  roundel?: string;
  /** Superchargers poking through the hood; two turns a wedge into the Twin Mill. */
  blowers?: 1 | 2;
  wing?: boolean;
  wingColor?: string;
  /** Coupe / muscle roofline; defaults to fastback and notch respectively. */
  tail?: CarTail;
  /** Pickup with the cab over the front axle (Deora). */
  cabForward?: boolean;
  /** Chrome bumpers; on by default for muscle cars, pickups and vans. */
  chrome?: boolean;
  /** Gasser stance: nose-high body on tall rear tyres. */
  lifted?: boolean;
  rims?: string;
  /** Red-line tyres. */
  redline?: boolean;
};

const WHITE = "#F5F8FC";
const BLACK = "#15181C";
const GUNMETAL = "#2A2D33";

const LOOKS: Record<string, CarLook> = {
  "'55 Chevy Bel Air Gasser": { body: "muscle", paint: "#12A5B8", sideFlash: "#F0531C", blowers: 1, lifted: true },
  "'70 Dodge Charger R/T": { body: "muscle", paint: "#6B2FB3", stripes: WHITE, tailBand: WHITE, tail: "fastback", rims: GUNMETAL },
  "Bone Shaker": { body: "hotrod", paint: "#C9952C", trim: "#3A2A10", sideFlash: BLACK, blowers: 1, rims: GUNMETAL, redline: true },
  "Custom '77 Dodge Van": { body: "van", paint: "#F1F3F5", trim: "#1E4FC2", sideFlash: "#FF8A1A", sideStripe: "#E8222C" },
  "Datsun 620": { body: "pickup", paint: "#D81F26", stripes: WHITE, sideStripe: WHITE, roundel: WHITE, rims: GUNMETAL },
  "Deora II": { body: "pickup", paint: "#1E45C8", sideFlash: WHITE, cabForward: true },
  "Ford Mustang Shelby GT500": { body: "muscle", paint: "#B9C0C8", stripes: BLACK, tail: "fastback", chrome: false, wing: true, wingColor: BLACK, rims: GUNMETAL },
  "Lamborghini Countach LP 5000 QV": { body: "wedge", paint: "#D9161C", wing: true },
  "Mazda RX-7 (FD)": { body: "coupe", paint: "#1747C4", wing: true, rims: "#8A6F4E" },
  "Nissan Skyline GT-R (R34)": { body: "coupe", paint: "#1B4FD1", tail: "notch", wing: true, rims: "#7C838C" },
  "Porsche 911 GT3 RS": { body: "coupe", paint: "#E6E8EB", stripes: BLACK, wing: true, wingColor: BLACK, rims: GUNMETAL, redline: true },
  "Rodger Dodger": { body: "muscle", paint: "#1A3FC4", sideFlash: WHITE, blowers: 1, tail: "fastback" },
  "Toyota AE86": { body: "coupe", paint: "#F1F3F5", trim: BLACK, hood: BLACK, tail: "hatch", rims: GUNMETAL },
  "Twin Mill": { body: "wedge", paint: "#1A3FC4", sideFlash: "#FF7A1A", blowers: 2, redline: true },
  "Volkswagen T1 Panel Bus": { body: "bus", paint: "#1A45C8", trim: "#F1F3F5", sideFlash: WHITE },
};

function guessBody(name: string): CarBody {
  const n = name.toLowerCase();
  if (/\b(bus|transporter|kombi)\b/.test(n)) return "bus";
  if (/\b(van|wagon)\b/.test(n)) return "van";
  if (/\b(pickup|truck|ranger|f-150|silverado|hilux)\b/.test(n)) return "pickup";
  if (/\b(lamborghini|ferrari|mclaren|pagani|bugatti|koenigsegg)\b/.test(n)) return "wedge";
  if (/'[4-7]\d\b|\b(charger|mustang|camaro|challenger|gto|chevelle|firebird|barracuda)\b/.test(n)) return "muscle";
  return "coupe";
}

export function lookFor(castingName: string, fallbackPaint: string): CarLook {
  return LOOKS[castingName] ?? { body: guessBody(castingName), paint: fallbackPaint };
}
