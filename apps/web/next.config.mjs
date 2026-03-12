/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker 部署必需
  reactStrictMode: true,
  transpilePackages: ['@blog/types', '@blog/utils', '@blog/validation'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  typedRoutes: true,
  experimental: {
    viewTransition: true,
  },
}

export default nextConfig
