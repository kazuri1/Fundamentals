/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@fundaments/shared",
    "@fundaments/knowledge-graph",
    "@fundaments/teaching-engine",
    "@fundaments/mastery-engine",
    "@fundaments/project-intelligence",
    "@fundaments/database"
  ]
};

export default nextConfig;