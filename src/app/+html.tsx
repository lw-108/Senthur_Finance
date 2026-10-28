import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML for web platform in Expo Router.
 * Injects Google Fonts preconnect and Space Grotesk stylesheet links.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />

        <ScrollViewStyleReset />

        {/* Global theme CSS: Prevents Chrome autofill & pasted suggestion inputs from flashing white in dark mode */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --sf-input-bg: #333333;
                --sf-input-text: #FFFFFF;
              }
              [data-theme="light"] {
                --sf-input-bg: #FFFFFF;
                --sf-input-text: #111111;
              }
              [data-theme="dark"] {
                --sf-input-bg: #333333;
                --sf-input-text: #FFFFFF;
              }
              input, textarea, select {
                background-color: transparent !important;
                color: inherit;
              }
              /* WebKit browser autofill & pasted text suggestion suppression */
              input:-webkit-autofill,
              input:-webkit-autofill:hover,
              input:-webkit-autofill:focus,
              input:-webkit-autofill:active,
              textarea:-webkit-autofill,
              textarea:-webkit-autofill:hover,
              textarea:-webkit-autofill:focus {
                -webkit-box-shadow: 0 0 0 1000px var(--sf-input-bg, #333333) inset !important;
                -webkit-text-fill-color: var(--sf-input-text, #FFFFFF) !important;
                caret-color: var(--sf-input-text, #FFFFFF) !important;
                transition: background-color 50000s ease-in-out 0s, color 50000s ease-in-out 0s !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
