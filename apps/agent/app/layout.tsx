import { NavHeader } from '@/components/NavHeader';
import { SignetAuthProvider } from '@/components/SignetAuthProvider';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signet — The Chain Is The Witness',
  description:
    "The universal platform for official acts — from a grandmother's will to the President's executive order. Permanent, verifiable attestations on-chain.",
  icons: {
    icon: '/signet-icon.svg',
  },
  openGraph: {
    title: 'Signet — The Chain Is The Witness',
    description:
      'Permanent, verifiable attestations for the documents that matter. Sign, attest, and verify on-chain.',
    url: 'https://signet.ventures',
    siteName: 'Signet',
    type: 'website',
  },
  other: {
    'base:app_id': '6a3c178d1425448483d5c3fb',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0A0A0A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen">
        <SignetAuthProvider>
          <NavHeader />
          {children}
        </SignetAuthProvider>
      </body>
    </html>
  );
}
