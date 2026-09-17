import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  { ignores: ["src/generated/**"] },
  {
    // CLI scripts are run by hand, never as cached turbo tasks, so their env
    // vars (e.g. DATABASE_URL_PRODUCTION) do not belong in turbo.json.
    files: ["scripts/**"],
    rules: { "turbo/no-undeclared-env-vars": "off" },
  },
];
