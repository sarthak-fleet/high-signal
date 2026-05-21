import type { NextConfig } from "next";

const config: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@high-signal/shared"],
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      // Canonicalize www -> apex (308 permanent).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.highsignal.app" }],
        destination: "https://highsignal.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default config;
