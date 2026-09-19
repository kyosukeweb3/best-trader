import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Best Trader — Kyosuke Life", description: "Hyperliquid trader research and monitoring." };

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
