/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.GITHUB_ACTIONS ? '/DBRSimulator' : '',
  assetPrefix: process.env.GITHUB_ACTIONS ? '/DBRSimulator/' : '',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
