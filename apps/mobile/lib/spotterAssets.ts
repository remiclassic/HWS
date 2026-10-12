/** Raster art for the Spotter skin (cut from the design reference in `ref/`). */
import carStage from "../assets/spotter/car-stage.jpg";
import carBelAirGasser from "../assets/spotter/cars/bel-air-gasser.webp";
import carBoneShaker from "../assets/spotter/cars/bone-shaker.webp";
import carChargerRt from "../assets/spotter/cars/charger-rt.webp";
import carCountach from "../assets/spotter/cars/countach-lp5000-qv.webp";
import carDatsun620 from "../assets/spotter/cars/datsun-620.webp";
import carDeoraII from "../assets/spotter/cars/deora-ii.webp";
import carDodgeVan from "../assets/spotter/cars/dodge-van.webp";
import carPorsche911Gt3Rs from "../assets/spotter/cars/porsche-911-gt3-rs.webp";
import carRodgerDodger from "../assets/spotter/cars/rodger-dodger.webp";
import carRx7Fd from "../assets/spotter/cars/rx7-fd.webp";
import carShelbyGt500 from "../assets/spotter/cars/shelby-gt500.webp";
import carSkylineGtrR34 from "../assets/spotter/cars/skyline-gtr-r34.webp";
import carToyotaAe86 from "../assets/spotter/cars/toyota-ae86.webp";
import carTwinMill from "../assets/spotter/cars/twin-mill.webp";
import carVwT1PanelBus from "../assets/spotter/cars/vw-t1-panel-bus.webp";
import headerScene from "../assets/spotter/header-scene.png";
import tireTread from "../assets/spotter/tire-tread.png";
import watermarkEngine from "../assets/spotter/watermark-engine.png";
import watermarkFlag from "../assets/spotter/watermark-flag.png";
import watermarkFlame from "../assets/spotter/watermark-flame.png";

export const spotterAssets = {
  carStage,
  headerScene,
  tireTread,
  watermarkEngine,
  watermarkFlag,
  watermarkFlame,
} as const;

/** Studio cutouts for starter-catalog castings, keyed by casting name. */
const CAR_ART: Record<string, number> = {
  "'55 Chevy Bel Air Gasser": carBelAirGasser,
  "'70 Dodge Charger R/T": carChargerRt,
  "Bone Shaker": carBoneShaker,
  "Custom '77 Dodge Van": carDodgeVan,
  "Datsun 620": carDatsun620,
  "Deora II": carDeoraII,
  "Ford Mustang Shelby GT500": carShelbyGt500,
  "Lamborghini Countach LP 5000 QV": carCountach,
  "Mazda RX-7 (FD)": carRx7Fd,
  "Nissan Skyline GT-R (R34)": carSkylineGtrR34,
  "Porsche 911 GT3 RS": carPorsche911Gt3Rs,
  "Rodger Dodger": carRodgerDodger,
  "Toyota AE86": carToyotaAe86,
  "Twin Mill": carTwinMill,
  "Volkswagen T1 Panel Bus": carVwT1PanelBus,
};

export function carArtFor(castingName: string | null | undefined): number | undefined {
  return castingName ? CAR_ART[castingName] : undefined;
}

/** Header scene is 912×235; the gear button is baked into the art at this box. */
export const HEADER_SCENE_ASPECT = 912 / 235;
export const HEADER_SCENE_SETTINGS_HOTSPOT = {
  top: "7.5%",
  right: "3.2%",
  width: "7.2%",
} as const;
