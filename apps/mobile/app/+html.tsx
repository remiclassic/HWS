import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";
import { scrollbarWebCss } from "../lib/theme";

/**
 * Root HTML for web (static export / SSR). Client dev also gets scrollbars via WebScrollbarStyles in _layout.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style id="hotwheels-scrollbar-theme-static" dangerouslySetInnerHTML={{ __html: scrollbarWebCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
