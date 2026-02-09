import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import './globals.css';

export const metadata: Metadata = {
  title: 'Mermaid AI Architect',
  description: 'AI-powered Mermaid diagram generator',
  keywords: ['mermaid', 'diagram', 'AI', 'generator', 'flowchart', 'sequence diagram'],
  authors: [{ name: 'Mermaid AI Architect Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Load Mermaid from CDN */}
        <Script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js" strategy="afterInteractive" />
      </head>
      <body className="selection:bg-brand-500/30">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
