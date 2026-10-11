import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    ignores: [".expo/**"],
  },
  {
    rules: {
      // `try { await Haptics…() } catch {}` is deliberate: haptics are best-effort.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
