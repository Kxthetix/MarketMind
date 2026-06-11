import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["172.20.10.4", "localhost", "127.0.0.1"],
};

export default nextConfig;
