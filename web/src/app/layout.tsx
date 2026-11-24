import type { Metadata } from 'next';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/public-sans';
import './globals.css';
import { Header } from '@/components/Header';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Vote: feature requests', template: '%s' },
  description: 'Suggest features, vote on what matters, and follow progress.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Providers>
          <Header />
          <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
