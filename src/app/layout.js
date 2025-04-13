import { Inter } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import ClientProviders from '@/components/ClientProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'iTicket - Helpdesk & Ticketing System',
  description: 'Modern ticketing system for efficient customer support',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} h-full min-h-screen bg-gray-50 dark:bg-gray-900`}>
        <ClientProviders session={session}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
