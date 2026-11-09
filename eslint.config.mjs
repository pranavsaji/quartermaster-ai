// ESLint for the API, packages, tests and scripts. The web app has its own config
// (apps/web/eslint.config.mjs) with the Next.js, React hooks and accessibility rules.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Pure packages may import each other, zod and node:crypto (hashing and Ed25519), nothing else
 * from Node or I/O libraries.
 */
const IMPURE_PATTERNS = [
  { group: ["node:*", "!node:crypto"], message: "Pure packages cannot use Node I/O; only node:crypto is allowed." },
  {
    group: ["fs", "fs/*", "path", "os", "net", "http", "https", "child_process", "worker_threads", "dns", "tls", "crypto"],
    message: "Pure packages cannot use Node I/O (import node:crypto for hashing).",
  },
  {
    group: ["@qm/database", "@qm/payments", "@qm/integrations", "drizzle-orm", "drizzle-orm/*", "pg", "@electric-sql/*"],
    message: "Pure packages cannot reach databases or external services; pass data in.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "apps/web/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      ".claude/**",
      "**/*.d.ts",
    ],
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
      // `!!x` narrows types; other implicit coercions (`+x`, `"" + x`) hide bugs.
      "no-implicit-coercion": ["error", { allow: ["!!"] }],
      "prefer-const": "error",
    },
  },
  {
    // TrustRail and Quartermaster decide about money: keep them deterministic and I/O-free.
    files: ["packages/trustrail/src/**/*.ts", "packages/quartermaster/src/**/*.ts", "packages/contracts/src/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: IMPURE_PATTERNS }],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Pure packages cannot do network I/O." },
        { name: "XMLHttpRequest", message: "Pure packages cannot do network I/O." },
        { name: "WebSocket", message: "Pure packages cannot do network I/O." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Pass `now` in; pure packages have no clock." },
        { object: "performance", property: "now", message: "Pass `now` in; pure packages have no clock." },
        { object: "process", property: "env", message: "Pure packages take configuration as arguments, not from the environment." },
        {
          object: "Math",
          property: "random",
          message: "Pure packages must be deterministic; use node:crypto for randomness that is part of the contract.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "Pass `now` in; pure packages have no clock." },
      ],
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
