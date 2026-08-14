import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/layout/SearchBar';
import { es } from '@/locales/es';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${es.brand.name} — ${es.brand.tagline}`,
    template: `%s · ${es.brand.name}`,
  },
  description: es.footer.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        <SearchBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
