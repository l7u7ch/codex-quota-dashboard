import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/login-form";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("LoginForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    pushMock.mockReset();
  });

  it("submits ID and password then continues after successful login", async () => {
    const onAuthenticated = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText("ID"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "admin", password: "admin" }),
      });
    });
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });

  it("shows an error when the credentials are rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<LoginForm onAuthenticated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("ID"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "incorrect" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("IDまたはパスワードが正しくありません。");
  });
});
