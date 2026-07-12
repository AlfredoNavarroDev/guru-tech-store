import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const allowedDevOrigins = process.env.HOST_IP
  ? [process.env.HOST_IP]
  : [];

const nextConfig: NextConfig = {
  reactCompiler: !isDev,
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: {
    optimizePackageImports: ["motion/react"],
  },
  // Razonamiento: habilitar logo remoto permite usar next/image sin romper optimización.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-70517b8feb72462790b99d3d0d9c7d63.r2.dev",
      },
    ],
  },
  ...(isDev && allowedDevOrigins.length > 0 && { allowedDevOrigins }),
};

export default nextConfig;
