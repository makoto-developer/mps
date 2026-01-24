/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:22301/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
