/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // List packages that should be treated as external
      // This prevents Next.js from attempting to bundle them
      config.externals.push('mysql2');
    }
    
    return config;
  },
};

export default nextConfig;
