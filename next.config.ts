import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  // The proxy buffers API bodies; allow a 25 MB recording plus multipart overhead.
  experimental: { proxyClientMaxBodySize: "26mb" },
};
export default config;
