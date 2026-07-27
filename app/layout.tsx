import type { Metadata } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "MRanking — Upload. Compare. Crown.",
  description: "Turn playlists and collections into head-to-head tournaments and crown one winner.",
  openGraph: {
    title: "MRanking — Upload. Compare. Crown.",
    description: "Turn a playlist into a private King of the Hill tournament.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "MRanking tournament bracket leading to one crowned winner." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MRanking — Upload. Compare. Crown.",
    description: "Turn a playlist into a private King of the Hill tournament.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${syne.variable}`}>{children}</body>
    </html>
  );
}
