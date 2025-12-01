import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: [
    "https://t.me",
    "https://web.telegram.org",
    "https://web.telegram.org/a",
    // Allow all ngrok domains for development using wildcard
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.yandexcloud.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
