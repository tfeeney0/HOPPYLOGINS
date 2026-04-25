import { fileURLToPath } from "node:url";
import withPWAInit from "@ducanh2912/next-pwa";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development"
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
