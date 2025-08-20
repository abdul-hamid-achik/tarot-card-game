import './globals.css';
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { Cinzel } from 'next/font/google';
import { SettingsMenu } from '@/components/game/SettingsMenu';
import { Toaster } from '@/components/ui/toaster';
import { AudioBootstrap } from '../components/ui/AudioBootstrap';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });

export const metadata = { title: 'Tarot TCG' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.className} dark`}>
      <body className="min-h-screen bg-slate-950 text-foreground antialiased">
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <AudioBootstrap />
            {children}
            <SettingsMenu />
            <Toaster />
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
