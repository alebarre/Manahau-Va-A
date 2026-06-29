const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return []
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://localhost:3001/:path*',
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
