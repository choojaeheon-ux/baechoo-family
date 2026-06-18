import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "배추가족",
    short_name: "배추가족",
    description: "배추가족이 함께 쓰는 가계부 · 생활기록 앱",
    start_url: "/budget",
    display: "standalone",
    background_color: "#faf7ef",
    theme_color: "#5b8c3e",
    orientation: "portrait",
    icons: [
      { src: "/icon-192-v2.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512-v2.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
