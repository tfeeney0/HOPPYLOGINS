import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "supabase-api"
      }
    },
    {
      urlPattern: ({ request }) => request.destination === "image",
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 60 * 60 * 24 * 30
        }
      }
    },
    {
      urlPattern: ({ request }) =>
        request.destination === "script" ||
        request.destination === "style" ||
        request.destination === "worker",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-resources"
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: projectRoot
  }
};

export default withPWA(nextConfig);
