import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const allowedDevOrigins = process.env.HOST_IP
  ? [process.env.HOST_IP]
  : [];

const nextConfig: NextConfig = {
  reactCompiler: !isDev,
  ...(isDev && allowedDevOrigins.length > 0 && { allowedDevOrigins }),
};

export default nextConfig;
