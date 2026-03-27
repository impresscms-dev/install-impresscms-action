import js from "@eslint/js"

export default [
  {
    ignores: ["node_modules/**", "dist/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly"
      }
    },
    rules: {
      "no-empty": ["error", {"allowEmptyCatch": true}],
      "no-restricted-syntax": [
        "error",
        {
          "selector": "NewExpression[callee.name='Error']",
          "message": "Use a typed class from src/Errors instead of Error directly."
        }
      ]
    }
  }
]
