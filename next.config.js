/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Enable server actions for form handling
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_APP_NAME: 'CampaignOS',
  },
};

module.exports = nextConfig;
