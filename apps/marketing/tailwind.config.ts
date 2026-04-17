import type { Config } from "tailwindcss";

import semearTailwindPreset from "@semear/config/tailwind/preset";

const config: Config = {
  presets: [semearTailwindPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
