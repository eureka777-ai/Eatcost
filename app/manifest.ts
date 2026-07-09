import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const asset = (path: string) => `${basePath}${path}`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eatcost",
    short_name: "Eatcost",
    description: "记录每餐价格、热量和今天还能吃多少。",
    start_url: `${basePath || ""}/`,
    scope: `${basePath || ""}/`,
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#007aff",
    orientation: "portrait",
    icons: [
      {
        src: asset("/icon.svg"),
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: asset("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: asset("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: asset("/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: asset("/apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
