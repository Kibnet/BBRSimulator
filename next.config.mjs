/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.GITHUB_ACTIONS ? '/BBRSilulator' : '',
  assetPrefix: process.env.GITHUB_ACTIONS ? '/BBRSilulator/' : '',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
