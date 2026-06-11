import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flood Rescue Control Tower",
  description: "Phase 1 disaster logistics control tower"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
