import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#080909",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim();
  const directHost = requestHeaders.get("host")?.trim();
  const candidateHost = forwardedHost || directHost || "localhost:3000";
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(candidateHost) ? candidateHost : "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost") ? "http" : "https";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
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
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${syne.variable}`}>{children}</body>
    </html>
  );
}
