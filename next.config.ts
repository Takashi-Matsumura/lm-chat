import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // ビルド時のESLintエラーを無視（Dockerビルド用）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時のTypeScriptエラーを無視（Dockerビルド用）
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
