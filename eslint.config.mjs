import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  tseslint.configs.eslintRecommended,
  tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
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
      "import/no-unresolved": "off",
      "no-console": "error",
    },
  },
  {
    ignores: ["out", "dist", "**/*.d.ts"],
  },
);
