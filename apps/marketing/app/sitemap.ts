import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3001";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/features", "/pricing", "/login"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
