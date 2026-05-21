import type { MetadataRoute } from "next";

const siteUrl = "https://high-signal-web.sarthakagrawal927.workers.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signals", "/signals/today", "/digest"],
        disallow: ["/review", "/api/", "/track-record", "/backtest-workbench"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
