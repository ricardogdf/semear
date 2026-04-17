import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

export function createMonorepoEslintConfig(baseDirectory) {
  const compat = new FlatCompat({
    baseDirectory,
    recommendedConfig: js.configs.recommended,
  });

  return [
    {
      ignores: [
        "**/.next/**",
        "**/dist/**",
        "**/coverage/**",
        "**/node_modules/**",
        "**/.turbo/**",
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended.map((config) => ({
      ...config,
      files: ["**/*.{ts,tsx}"],
      rules: {
        ...config.rules,
        "no-undef": "off",
      },
    })),
    ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
    {
      files: ["**/*.{ts,tsx}"],
      rules: {
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
      },
    },
  ];
}
