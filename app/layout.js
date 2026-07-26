import { IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';
import ThemeInit from './components/ThemeInit';
import GlobalChrome from './components/GlobalChrome';
import MaintenanceScreen from './components/system/MaintenanceScreen';
import GlobalErrorBoundary from './components/system/GlobalErrorBoundary';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm',
  display: 'swap',
});

export const metadata = {
  title: 'MockPrep — AI Mock Interview Platform',
  description:
    'Free AI-powered mock interview practice platform for Technical, Behavioral (STAR), System Design, Case Study, and Stress rounds with instant structured feedback.',
  keywords: [
    'mock interview',
    'AI interview practice',
    'technical interview prep',
    'behavioral interview STAR method',
    'system design interview',
    'coding interview practice',
    'free interview simulator',
  ],
  authors: [{ name: 'MockPrep' }],
  openGraph: {
    title: 'MockPrep — AI Mock Interview Platform',
    description:
      'Practice technical, behavioral, system design, and coding interviews with real-time AI feedback. 100% free forever.',
    siteName: 'MockPrep',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MockPrep — AI Mock Interview Platform',
    description:
      'Practice technical, behavioral, and system design interviews with instant AI scoring.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <ThemeInit />
        <GlobalErrorBoundary>
          <MaintenanceScreen>{children}</MaintenanceScreen>
        </GlobalErrorBoundary>
        <GlobalChrome />
      </body>
    </html>
  );
}
