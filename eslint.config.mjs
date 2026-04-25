import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "public/sw.js",
      "public/workbox-*.js",
      "public/worker-*.js",
      "public/fallback-*.js"
    ]
  }
];

export default eslintConfig;
