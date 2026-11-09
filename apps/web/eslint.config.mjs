// ESLint flat config for the web app. `pnpm --filter @qm/web lint` must pass with zero warnings.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

const config = [
  { ignores: [".next/**", "next-env.d.ts", "node_modules/**"] },

  // Next.js + React + react-hooks (v7 incl. the React Compiler rules such as `refs`) + typescript-eslint.
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    name: "qm/web",
    files: ["**/*.{ts,tsx,mjs}"],
    rules: {
      // The plugins are registered by eslint-config-next; enable their full recommended sets.
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/refs": "error",

      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-console": ["error", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "max-len": ["error", { code: 160, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
    },
  },

  {
    name: "qm/web/tests",
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default config;
