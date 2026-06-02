import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delphi — decisions, with receipts",
  description:
    "A structured panel of AI experts debates your decision over multiple rounds. Gated demo by Agilist.",
  metadataBase: new URL("https://delphi.agilist.co.uk")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Kalam:wght@400;700&family=JetBrains+Mono:wght@400;500&family=Source+Serif+Pro:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
