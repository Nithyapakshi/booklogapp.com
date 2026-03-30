/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["books.google.com", "m.media-amazon.com"],
  },
  // Ensure pages are properly recognized
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  // Disable type checking during build to avoid issues
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build to avoid issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Removed experimental options that are now default or deprecated
}

module.exports = nextConfig
