import type { NextConfig } from "next";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Load the documented root .env without overriding deployment environment variables.
// Keep dotenv in the build/server config, outside the bundled route modules.
config({ path: path.join(repoRoot, '.env'), quiet: true });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  poweredByHeader: false,
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
