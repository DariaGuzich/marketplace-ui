import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "urql";
import { graphql } from "./gql";
import type { SettingsQuery } from "./gql/graphql";

// Запросы UI к BFF. По ним npm run gen генерирует типы: SettingsQuery, UpdateSettingsMutation и т. д.
// Если в схеме BFF поля из запроса больше нет, npm run gen упадёт с ошибкой валидации.
const settingsQuery = graphql(`
  query Settings($accountId: ID!) {
    settings(accountId: $accountId) {
      floorPrice
      currency
      blockedDomains
    }
  }
`);

const updateSettingsMutation = graphql(`
  mutation UpdateSettings($accountId: ID!, $input: SettingsInput!) {
    updateSettings(accountId: $accountId, input: $input) {
      floorPrice
      currency
      blockedDomains
    }
  }
`);

export function SettingsPage({ accountId }: { accountId: string }) {
  const [result] = useQuery({ query: settingsQuery, variables: { accountId } });

  if (!result.data && result.fetching) {
    return <p>Загрузка…</p>;
  }
  if (result.error) {
    return <p role="alert">Ошибка: {result.error.message}</p>;
  }

  return (
    <main>
      <h1>Настройки аккаунта {accountId}</h1>
      <SettingsForm accountId={accountId} settings={result.data?.settings ?? null} />
    </main>
  );
}

function SettingsForm({ accountId, settings }: { accountId: string; settings: SettingsQuery["settings"] }) {
  const [floorPrice, setFloorPrice] = useState(settings ? String(settings.floorPrice) : "");
  const [currency, setCurrency] = useState(settings?.currency ?? "");
  const [blockedDomains, setBlockedDomains] = useState(settings?.blockedDomains.join("\n") ?? "");
  const [saveResult, updateSettings] = useMutation(updateSettingsMutation);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateSettings({
      accountId,
      input: {
        floorPrice: Number(floorPrice),
        currency,
        blockedDomains: blockedDomains.split("\n").map((domain) => domain.trim()).filter(Boolean),
      },
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {settings === null && <p>Настройки ещё не сохранены</p>}
      <p>
        <label>
          Минимальная цена <input type="number" step="0.01" value={floorPrice} onChange={(e) => setFloorPrice(e.target.value)} />
        </label>
      </p>
      <p>
        <label>
          Валюта <input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </label>
      </p>
      <p>
        <label>
          Заблокированные домены (по одному на строке)
          <br />
          <textarea rows={5} value={blockedDomains} onChange={(e) => setBlockedDomains(e.target.value)} />
        </label>
      </p>
      <button type="submit" disabled={saveResult.fetching}>
        Сохранить
      </button>
      {saveResult.data && <p role="status">Сохранено</p>}
      {saveResult.error && <p role="alert">Ошибка: {saveResult.error.message}</p>}
    </form>
  );
}
