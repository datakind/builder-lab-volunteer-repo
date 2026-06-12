import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humanitarian Projects Manager",
  description: "AI-assisted humanitarian project management and donor reporting dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
