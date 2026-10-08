import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nook & Table",
  description: "A lightweight, low-chaos table booking and reservation management system tailored specifically for neighborhood cafes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
