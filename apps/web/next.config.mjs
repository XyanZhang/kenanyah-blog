/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@blog/types', '@blog/utils', '@blog/validation'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  typedRoutes: true,
  experimental: {
    viewTransition: true,
  },
}

export default nextConfig
