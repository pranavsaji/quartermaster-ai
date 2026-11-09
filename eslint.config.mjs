// ESLint for the API, packages, tests and scripts. The web app has its own config
// (apps/web/eslint.config.mjs) with the Next.js, React hooks and accessibility rules.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Imports that would make a pure package touch the outside world. */
const IMPURE = [
  { name: "@qm/database", message: "Pure packages cannot use the database; pass data in." },
  { name: "drizzle-orm", message: "Pure packages cannot use the database; pass data in." },
  { name: "pg", message: "Pure packages cannot use the database; pass data in." },
  { name: "node:fs", message: "Pure packages cannot touch the filesystem." },
  { name: "node:http", message: "Pure packages cannot do network I/O." },
  { name: "node:https", message: "Pure packages cannot do network I/O." },
  { name: "@qm/payments", message: "Pure packages cannot call payment providers." },
  { name: "@qm/integrations", message: "Pure packages cannot call external services." },
];

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "apps/web/**", "coverage/**", "test-results/**", "playwright-report/**", ".claude/**", "**/*.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // Money and payment paths must never drop a promise or compare loosely.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { arguments: false } }],
      "@typescript-eslint/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/prefer-promise-reject-errors": "error",
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // Callbacks passed to asyncHandler / AgentRun.tool must return promises even when synchronous.
      "@typescript-eslint/require-await": "off",
      // Drizzle row types and JSON payloads make these too noisy to be useful here.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true, allowBoolean: true, allowNullish: true }],
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-implicit-coercion": "error",
      "prefer-const": "error",
    },
  },
  {
    // TrustRail and Quartermaster decide about money: keep them deterministic and I/O-free.
    files: ["packages/trustrail/src/**/*.ts", "packages/quartermaster/src/**/*.ts", "packages/contracts/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: IMPURE }],
      "no-restricted-globals": ["error", { name: "fetch", message: "Pure packages cannot do network I/O." }],
      "no-restricted-properties": ["error", { object: "Date", property: "now", message: "Pass `now` in; pure packages have no clock." }],
      "no-restricted-syntax": ["error", { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "Pass `now` in; pure packages have no clock." }],
    },
  },
  {
    // Command-line entry points and scripts talk to the terminal.
    files: ["**/cli/**/*.ts", "scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/unbound-method": "off",
      // Fakes stringify fetch bodies they know are strings; assertions reject with plain values.
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
    },
  },
  {
    files: ["**/*.mjs", "**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
