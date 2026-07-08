import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin es Node puro: no debe pasar por el bundler.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
