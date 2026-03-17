import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import SessionProvider from '@/components/providers/SessionProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ITHINK — Train Your Mind',
  description:
    'Sharpen your cognitive abilities with puzzles, logic challenges, and pattern recognition exercises. Track your progress and compete with others.',
  keywords: ['puzzles', 'brain training', 'cognitive', 'logic', 'pattern recognition', 'brain teasers'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-txt min-h-screen`}
      >
        <SessionProvider>
          {/* Noise texture overlay */}
          <div className="noise-overlay" aria-hidden="true" />

          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
