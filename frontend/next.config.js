/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=self' },
        ],
      },
    ];
  },
  webpack: (config) => {
    // Required for face-api.js in Next.js (browser environment)
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false, encoding: false, fs: false };
    return config;
  },
};

module.exports = nextConfig;
