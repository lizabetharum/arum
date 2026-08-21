import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint runs in the editor; the build shouldn't fail (or warn) over a missing
  // standalone ESLint install.
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    serverActions: {
      // HTML items are pasted whole into a form field, and a page saved from a
      // browser routinely runs past the 1 MB default — which fails as a bare
      // "Application error" before the action code ever runs. 4 MB is as high as
      // this can usefully go: Vercel caps a serverless request body at 4.5 MB,
      // so anything larger fails at the platform instead. lib/constants.ts holds
      // the matching ceiling the form checks against before submitting.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
