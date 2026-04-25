import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        surface: "var(--surface)",
        border: "var(--border)"
      }
    }
  }
};

export default config;
