import './globals.css';
import Link from 'next/link';
import { Cinzel } from 'next/font/google';
import { SettingsMenu } from '@/components/game/SettingsMenu';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });

export const metadata = { title: 'Tarot TCG' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.className} dark`}>
      <body className="min-h-screen bg-slate-950 text-foreground antialiased">
        {children}
        <SettingsMenu />
      </body>
    </html>
  );
}
