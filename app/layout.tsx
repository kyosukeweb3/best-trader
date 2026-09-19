import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Best Trader — Kyosuke Life", description: "選定した6人のトレーダーの収益とポジションを継続観測。" };

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}

