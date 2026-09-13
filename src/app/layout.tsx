import type { Metadata } from "next";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Lens Atlas — Find the signal behind the handle",
    template: "%s · Lens Atlas",
  },
  description:
    "Explore identities, wallet mappings, observed connections, and sampled trading evidence.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
