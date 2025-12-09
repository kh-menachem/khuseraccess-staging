/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'chrome-aws-lambda', 'puppeteer-core']
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude chrome-aws-lambda and puppeteer-core from bundling
      config.externals = [...(config.externals || []), 'chrome-aws-lambda', 'puppeteer-core'];
    }
    return config;
  },
}

export default nextConfig
