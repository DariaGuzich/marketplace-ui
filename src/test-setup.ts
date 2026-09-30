// Матчеры для DOM в expect: toHaveValue, toBeInTheDocument и т. д.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
