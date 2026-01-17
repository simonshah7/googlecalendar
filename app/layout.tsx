import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampaignOS - Marketing Campaign Calendar',
  description: 'Plan and manage your marketing campaigns with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 dark:bg-valuenova-bg text-gray-800 dark:text-valuenova-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
