import './globals.css';
import Link from 'next/link';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700'] });

export const metadata = { title: 'Tarot TCG' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.className} dark`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Themed background */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1000px_400px_at_50%_-10%,rgba(234,179,8,0.06),transparent),radial-gradient(700px_300px_at_0%_20%,rgba(59,130,246,0.05),transparent),linear-gradient(to_bottom,#0b1020,#0a0f1a)]" />

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-amber-900/30 bg-black/40 backdrop-blur">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="flex h-14 items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-md bg-amber-400/20 ring-1 ring-inset ring-amber-300/30 shadow-[0_0_20px_rgba(251,191,36,0.15)]" />
                <span className="text-amber-300 font-bold tracking-wide">Tarot TCG</span>
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/" className="text-amber-200/80 hover:text-amber-300 transition-colors">Home</Link>
                <Link href="/match-demo" className="text-amber-200/80 hover:text-amber-300 transition-colors">Demo</Link>
                <Link href="/match-live" className="text-amber-200/80 hover:text-amber-300 transition-colors">Live</Link>
                <Link href="/play" className="text-amber-200/80 hover:text-amber-300 transition-colors">Play</Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-xl border border-amber-900/30 bg-black/30 shadow-[0_0_0_1px_rgba(251,191,36,0.05),0_10px_40px_-12px_rgba(0,0,0,0.6)]">
            <div className="p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-amber-900/30 bg-black/40">
          <div className="container mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
            <span className="text-amber-300/80">★</span> May fate be in your favor.
          </div>
        </footer>
      </body>
    </html>
  );
}
