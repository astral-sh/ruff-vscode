import tseslint from "typescript-eslint";
import { importX } from "eslint-plugin-import-x";

export default tseslint.config(
  tseslint.configs.eslintRecommended,
  tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      ecmaVersion: 6,
      sourceType: "module",
    },
    rules: {
      eqeqeq: [
        "error",
        "always",
        {
          null: "never",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      // Handled by typescript. It doesn't support shared?
      "import-x/no-unresolved": "off",
      "no-console": "error",
    },
  },
  {
    ignores: ["out", "dist", "**/*.d.ts"],
  },
);
