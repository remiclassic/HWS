import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * True for desktop-style web (mouse + hover). False on native apps and on touch-primary mobile web.
 */
export function usePrefersFinePointer() {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) {
      setFine(false);
      return;
    }
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return fine;
}
