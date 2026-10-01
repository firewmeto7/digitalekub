import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ekub Operations",
  description: "Operational status for the Ekub platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}