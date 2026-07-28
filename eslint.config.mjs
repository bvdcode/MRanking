import { defineConfig, globalIgnores } from "eslint/config";
import css from "@eslint/css";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import projectRules from "./eslint-rules.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    plugins: { project: projectRules },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      curly: ["error", "all"],
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      "no-console": "error",
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: "Use a Zustand store instead." },
      ],
      "project/no-inline-styles": "error",
      "project/no-nested-assertions": "error",
      "project/no-unknown": "error",
      "project/no-full-viewport-width": "error",
    },
  },
  {
    files: ["**/*.css"],
    language: "css/css",
    plugins: { css, project: projectRules },
    rules: {
      "project/max-source-lines": "error",
      "project/no-full-viewport-width": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "Themes inputs/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
