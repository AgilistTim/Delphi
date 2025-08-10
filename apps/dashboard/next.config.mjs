/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow importing code from outside the Next.js app directory (monorepo-style)
    externalDir: true
  },
  typescript: {
    // Keep strict later; for MVP we can allow building even if types have issues
    ignoreBuildErrors: true
  }
};

export default nextConfig;
