import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import AuthGate from '@/components/AuthGate';

export const metadata: Metadata = {
  title: 'Cocoa Canvas',
  description: 'Open-source voter database and canvassing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-cream-50 dark:bg-cocoa-900 text-cocoa-900 dark:text-cream-100 transition-colors">
        <ThemeProvider>
          <AuthGate>{children}</AuthGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
