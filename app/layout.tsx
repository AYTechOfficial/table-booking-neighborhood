import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juniper Table",
  description: "A focused, direct-booking site for neighborhood cafes: it gives guests an easy way to reserve and staff a simple way to manage tables, without the breadth of a full restaurant operations platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
