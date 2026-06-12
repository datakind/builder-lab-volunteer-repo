import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vietnam Disaster Impact Dashboard",
  description: "Interactive bilingual dashboard for disaster impact metrics.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
