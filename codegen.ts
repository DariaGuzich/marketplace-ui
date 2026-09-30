import type { CodegenConfig } from "@graphql-codegen/cli";

// npm run gen:
// 1. берёт GraphQL-схему BFF из main-ветки marketplace-bff;
// 2. находит GraphQL-запросы в коде UI (вызовы graphql(`...`));
// 3. проверяет запросы по схеме и генерирует для них типы в src/gql/.
const config: CodegenConfig = {
  schema: "https://raw.githubusercontent.com/DariaGuzich/marketplace-bff/main/schema.graphql",
  documents: ["src/**/*.tsx"],
  ignoreNoDocuments: true,
  generates: {
    "./src/gql/": {
      preset: "client",
    },
  },
};

export default config;
