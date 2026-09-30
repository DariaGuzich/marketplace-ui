import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { graphql, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Client, Provider, cacheExchange, fetchExchange } from "urql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type {
  SettingsQuery,
  SettingsQueryVariables,
  UpdateSettingsMutation,
  UpdateSettingsMutationVariables,
} from "./gql/graphql";
import { SettingsPage } from "./SettingsPage";

// BFF замокан через MSW: GraphQL-обработчики перехватывают запросы по имени операции (Settings, UpdateSettings).
// Ответы и переменные типизированы сгенерированными типами: если схема BFF изменится
// и после npm run gen типы станут другими, npm run typecheck упадёт на этих моках.

const BFF_URL = "http://bff.test/graphql";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const client = new Client({ url: BFF_URL, exchanges: [cacheExchange, fetchExchange] });
  render(
    <Provider value={client}>
      <SettingsPage accountId="acc-1" />
    </Provider>,
  );
}

describe("SettingsPage", () => {
  it("shows saved settings", async () => {
    server.use(
      graphql.query<SettingsQuery, SettingsQueryVariables>("Settings", () =>
        HttpResponse.json({
          data: { settings: { floorPrice: 1.5, currency: "USD", blockedDomains: ["bad.com", "spam.net"] } },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByLabelText("Валюта")).toHaveValue("USD");
    expect(screen.getByLabelText("Минимальная цена")).toHaveValue(1.5);
    expect(screen.getByLabelText(/Заблокированные домены/)).toHaveValue("bad.com\nspam.net");
  });

  it("shows empty form when settings are not saved yet", async () => {
    server.use(
      graphql.query<SettingsQuery, SettingsQueryVariables>("Settings", () =>
        HttpResponse.json({ data: { settings: null } }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Настройки ещё не сохранены")).toBeInTheDocument();
    expect(screen.getByLabelText("Валюта")).toHaveValue("");
  });

  it("saves edited settings", async () => {
    let receivedVariables: UpdateSettingsMutationVariables | undefined;
    server.use(
      graphql.query<SettingsQuery, SettingsQueryVariables>("Settings", () =>
        HttpResponse.json({ data: { settings: null } }),
      ),
      graphql.mutation<UpdateSettingsMutation, UpdateSettingsMutationVariables>("UpdateSettings", ({ variables }) => {
        receivedVariables = variables;
        return HttpResponse.json({ data: { updateSettings: variables.input } });
      }),
    );
    const user = userEvent.setup();

    renderPage();
    await user.type(await screen.findByLabelText("Минимальная цена"), "2.5");
    await user.type(screen.getByLabelText("Валюта"), "EUR");
    await user.type(screen.getByLabelText(/Заблокированные домены/), "bad.com{enter}spam.net");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Сохранено");
    expect(receivedVariables).toEqual({
      accountId: "acc-1",
      input: { floorPrice: 2.5, currency: "EUR", blockedDomains: ["bad.com", "spam.net"] },
    });
  });
});
