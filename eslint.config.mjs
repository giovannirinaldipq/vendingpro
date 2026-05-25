import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Project-wide rule tuning
  {
    rules: {
      // React 19 quer setState fora de useEffect, mas os padrões legítimos
      // (mount detection para evitar hydration mismatch, fetch async com setData)
      // são amplamente usados e seguros. Mantemos como warn pra não bloquear builds
      // enquanto migra-se gradualmente para useSyncExternalStore / Suspense.
      "react-hooks/set-state-in-effect": "warn",
      // Base UI Select muta refs por design (interop com positioner) — aceita.
      "react-hooks/incompatible-library": "warn",
    },
  },
]);

export default eslintConfig;
