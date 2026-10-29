import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BalanceSummary } from "./BalanceSummary";

describe("Displayed balance summary", () => {
  it("totals only a single displayed currency", () => {
    render(<BalanceSummary balances={[{ currency: "USD", available_balance: "75.00" }, { currency: "USD", available_balance: "20.00" }]} />);
    expect(screen.getByText("Total balance")).toBeVisible();
    expect(screen.getByText("USD 95.00")).toBeVisible();
  });

  it("lists multiple currencies without adding unlike amounts", () => {
    render(<BalanceSummary balances={[{ currency: "USD", available_balance: "75.00" }, { currency: "EUR", available_balance: "20.00" }]} />);
    expect(screen.getByText("2 currencies")).toBeVisible();
    expect(screen.getByText("USD")).toBeVisible();
    expect(screen.getByText("EUR")).toBeVisible();
    expect(screen.getByText(/No conversion applied/)).toBeVisible();
    expect(screen.queryByText(/95/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mixed/i)).not.toBeInTheDocument();
  });

  it("does not invent a zero balance when no records are displayed", () => {
    render(<BalanceSummary balances={[]} />);
    expect(screen.getByText("No synced balance yet")).toBeVisible();
    expect(screen.queryByText(/0\.00/)).not.toBeInTheDocument();
  });
});
