import { IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';
import ThemeInit from './components/ThemeInit';
import GlobalChrome from './components/GlobalChrome';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm',
  display: 'swap',
});

export const metadata = {
  title: 'MockPrep — Interview Practice',
  description:
    'Practice technical, HR, case, and stress interviews with structured feedback.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <ThemeInit />
        {children}
        <GlobalChrome />
      </body>
    </html>
  );
}
