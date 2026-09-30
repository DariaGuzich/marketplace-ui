import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Client, Provider, cacheExchange, fetchExchange } from "urql";
import { SettingsPage } from "./SettingsPage";

const client = new Client({
  url: import.meta.env.VITE_BFF_URL ?? "http://localhost:4000/graphql",
  exchanges: [cacheExchange, fetchExchange],
});

// Пока нет авторизации, аккаунт выбирается в адресе: ?accountId=acc-2.
// Позже accountId будет браться из данных вошедшего пользователя.
const accountId = new URLSearchParams(window.location.search).get("accountId") ?? "acc-1";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider value={client}>
      <SettingsPage accountId={accountId} />
    </Provider>
  </StrictMode>,
);
