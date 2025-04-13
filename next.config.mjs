/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // List packages that should be treated as external
      // This prevents Next.js from attempting to bundle them
      config.externals.push('mysql2');
      
      // Add fallback for sqlite3 to prevent it from being bundled
      config.resolve.fallback = {
        ...config.resolve.fallback,
        sqlite3: false,
        'sqlite3-offline': false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
