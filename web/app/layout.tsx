import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Public_Sans } from 'next/font/google';

import TopBar from '@/components/shell/TopBar';
import { clerkAppearance } from '@/lib/appearance';

import './globals.css';

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['300', '500'],
  variable: '--font-public-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'a-stack',
  description: 'A web app template: Next.js, FastAPI, Supabase, Clerk, Modal.',
};

function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className={`${publicSans.variable} ${plexMono.variable}`}>
        <body>
          <TopBar />
          <main className="mx-auto w-full max-w-[1128px] pb-[30vh]">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}

export default RootLayout;
