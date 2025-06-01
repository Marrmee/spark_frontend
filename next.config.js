/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'gateway.pinata.cloud',
      'red-improved-cod-476.mypinata.cloud',
      'protocol.poscidondao.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: '**.poscidondao.com',
      }
    ]
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  // Remove headers configuration since it's handled in middleware
  serverExternalPackages: ['docusign-esign'],
};

module.exports = nextConfig;
