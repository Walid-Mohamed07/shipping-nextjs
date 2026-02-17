/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization?.splitChunks?.cacheGroups &&
        (config.optimization.splitChunks.cacheGroups.swagger = {
          test: /[\\/]node_modules[\\/]swagger-ui-react[\\/]/,
          name: 'swagger-ui',
          priority: 10,
          reuseExistingChunk: true,
          enforce: true,
        });
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  turbopack: {},
}

export default nextConfig