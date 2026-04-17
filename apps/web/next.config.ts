import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@semear/database", "@semear/ui", "@semear/utils"],
};

export default nextConfig;
