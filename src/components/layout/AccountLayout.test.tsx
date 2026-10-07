import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AccountLayout from "./AccountLayout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "customer@example.test", name: "Customer", picture: null },
    loading: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/contexts/LanguageContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/contexts/LanguageContext")>()),
  useLanguage: () => ({ currentLanguage: "en", setLanguage: vi.fn(), isTranslating: false }),
}));

vi.mock("@/components/help/HelpChatbot", () => ({ default: () => null }));

describe("mobile account navigation", () => {
  it("opens from the real account header and marks KYC/KYB active", () => {
    render(
      <MemoryRouter initialEntries={["/account/kyc"]}>
        <Routes>
          <Route path="/account" element={<AccountLayout />}>
            <Route path="kyc" element={<div>KYC page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole("button", { name: /menu/i });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const navigation = screen.getByRole("navigation", { name: "Mobile account navigation" });
    const kycLink = within(navigation).getByRole("link", { name: "KYC/KYB" });
    expect(kycLink).toHaveAttribute("href", "/account/kyc");
    expect(kycLink).toHaveAttribute("aria-current", "page");
    const mobileControls = screen.getByLabelText("Mobile account controls");
    expect(within(mobileControls).getByRole("link", { name: "Move funds" })).toBeVisible();
    expect(within(mobileControls).getByRole("button", { name: "Select language" })).toBeVisible();
    expect(within(mobileControls).getByRole("button", { name: "My account" })).toBeVisible();
  });
});
