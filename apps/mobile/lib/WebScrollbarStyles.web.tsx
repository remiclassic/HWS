import { useEffect } from "react";
import { scrollbarWebCss } from "./theme";

const STYLE_ID = "hotwheels-scrollbar-theme";
const STATIC_STYLE_ID = "hotwheels-scrollbar-theme-static";

export function WebScrollbarStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID) || document.getElementById(STATIC_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = scrollbarWebCss;
    document.head.appendChild(el);
  }, []);
  return null;
}
