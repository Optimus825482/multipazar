import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // === TypeScript kurallari (koruyucu) ===
    // any kullanimini uyari olarak birak - cok fazla yerde var, asamali olarak temizlenecek
    "@typescript-eslint/no-explicit-any": "warn",
    // Kullanilmayan degiskenleri yakala (alt cizgi ile baslayanlar muaf)
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    }],
    // ts-ignore yerine ts-expect-error kullan (neden belirtilmeli)
    "@typescript-eslint/ban-ts-comment": ["error", {
      "ts-expect-error": "allow-with-description",
      "ts-ignore": true,
      "ts-nocheck": true,
      "ts-check": false,
      minimumDescriptionLength: 10,
    }],
    "@typescript-eslint/no-non-null-assertion": "warn",

    // === React kurallari ===
    // exhaustive-deps hook bug'larini onler - once warn, sonra error
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",

    // === Next.js kurallari ===
    "@next/next/no-img-element": "warn",

    // === Genel JavaScript kurallari ===
    "prefer-const": "error",
    "no-unused-vars": "off", // TS versiyonu kullaniliyor
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-unreachable": "error",
    "no-useless-escape": "warn",
    "no-irregular-whitespace": "error",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills/**", "scripts/**"],
}];

export default eslintConfig;
