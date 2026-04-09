import React from 'react';
import './globals.css';

export const metadata = {
  title: 'LUTO-VUE',
  description: 'Land-use Trade-offs and Optimisation — Scenario Explorer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans antialiased">{children}</body>
    </html>
  );
}
