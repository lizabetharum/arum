import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint runs in the editor; the build shouldn't fail (or warn) over a missing
  // standalone ESLint install.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
