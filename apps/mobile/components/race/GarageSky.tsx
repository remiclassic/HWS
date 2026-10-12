/**
 * The garage the race is set in: an equirectangular (2:1) panorama wrapped round the
 * whole track, with its floor laid flat under the cars.
 *
 * Renders inside the R3F <Canvas>. Draws nothing until the panorama has loaded (and
 * nothing at all if it fails), so the scene's background colour is the fallback.
 */
import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useThree } from "@react-three/fiber";
import { Asset } from "expo-asset";
import * as THREE from "three";
import garageSky from "../../assets/race/garage-sky.jpg";
import { TRACK_CENTRE } from "../../lib/race/track";

/** Polished concrete, averaged from the panorama's floor; for a ground plane or fog. */
export const GARAGE_FLOOR_COLOR = "#a68070";

/** Middle of the track on the ground (it spans roughly x −15…245, z −185…245). */
const CENTRE_X = TRACK_CENTRE.x;
const CENTRE_Z = TRACK_CENTRE.z;
/** Height of the garage floor in the world; the road sits a hair above it. */
const FLOOR_Y = 0;
export const GARAGE_SKY_RADIUS = 700;
/** How much of the panorama, measured up from its bottom edge, is floor. */
const FLOOR_FRACTION = 0.4;
/** Angle below the panorama's horizon at which its walls meet its floor (18° for 40%). */
const FLOOR_DIP = (0.5 - FLOOR_FRACTION) * Math.PI;
/**
 * Vertical placement. A panorama's horizon is the equator of its sphere, so centring the
 * sphere at the chase camera (y ≈ 4) would put the picture's floor in a bowl hundreds of
 * units under the track, with a real ground plane cutting the walls off at shelf height.
 * Instead the sphere is lifted until its wall/floor line touches the real floor, and the
 * cap below that line is pressed flat onto y = FLOOR_Y. The painted floor is then the
 * actual floor the track sits on, the walls stand on it ~665 units out, and the horizon
 * ends up this far overhead: the garage seen from a toy car's height.
 */
export const GARAGE_EYE_HEIGHT = GARAGE_SKY_RADIUS * Math.sin(FLOOR_DIP);

// 3° rings, so one lands exactly on the wall/floor line and the corner stays crisp.
const WIDTH_SEGMENTS = 96;
const HEIGHT_SEGMENTS = 60;

function buildShell(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(GARAGE_SKY_RADIUS, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
  // Mirror it so the picture reads the right way round from inside; this also turns the
  // faces inward, which is why the material is FrontSide rather than BackSide.
  geo.scale(-1, 1, 1);
  const pos = geo.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.y < -GARAGE_EYE_HEIGHT) {
      // Slide the vertex along its ray from the centre until it lands on the floor.
      v.multiplyScalar(GARAGE_EYE_HEIGHT / -v.y);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/** The panorama as an sRGB texture, or null while loading / if loading failed. */
function useGarageTexture(): THREE.Texture | null {
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    const fail = (err: unknown) => console.warn("[race] garage panorama failed to load", err);
    try {
      // Native: R3F patches TextureLoader.load to take the bundler's asset id directly
      // (it resolves it through expo-asset). Web: three needs a URL, so resolve it here.
      const source = Platform.OS === "web" ? Asset.fromModule(garageSky).uri : garageSky;
      new THREE.TextureLoader().load(
        source as unknown as string,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          // The floor is seen at a grazing angle; this keeps it from smearing.
          tex.anisotropy = Math.min(8, maxAnisotropy || 1);
          tex.needsUpdate = true;
          loaded = tex;
          setTexture(tex);
        },
        undefined,
        fail,
      );
    } catch (err) {
      fail(err);
    }
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [maxAnisotropy]);

  return texture;
}

type GarageSkyProps = {
  /** Turns the garage about the vertical axis (radians). At 0 the picture's centre is toward −X. */
  yaw?: number;
};

export function GarageSky({ yaw = 0 }: GarageSkyProps) {
  const shell = useMemo(buildShell, []);
  const texture = useGarageTexture();
  if (!texture) return null;
  return (
    // Drawn first and without writing depth: everything else paints over it, and the
    // flattened floor cannot z-fight with the road lying on it.
    <mesh
      geometry={shell}
      position={[CENTRE_X, FLOOR_Y + GARAGE_EYE_HEIGHT, CENTRE_Z]}
      rotation={[0, yaw, 0]}
      renderOrder={-1}
      frustumCulled={false}
    >
      <meshBasicMaterial map={texture} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
