import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SetupForm } from "@/components/setup-form";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("SetupForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    pushMock.mockReset();
  });

  it("creates the chosen account then navigates to the dashboard", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<SetupForm />);
    fireEvent.change(screen.getByLabelText("ID"), { target: { value: "owner" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "strong-secret-password" } });
    fireEvent.change(screen.getByLabelText("パスワード（確認）"), { target: { value: "strong-secret-password" } });
    fireEvent.click(screen.getByRole("button", { name: "アカウントを作成" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/setup", expect.objectContaining({
      method: "POST", body: JSON.stringify({ id: "owner", password: "strong-secret-password" }),
    })));
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("does not submit when passwords disagree", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SetupForm />);
    fireEvent.change(screen.getByLabelText("ID"), { target: { value: "owner" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "strong-secret-password" } });
    fireEvent.change(screen.getByLabelText("パスワード（確認）"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "アカウントを作成" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("パスワードが一致しません。");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits a short nonempty password", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<SetupForm />);
    fireEvent.change(screen.getByLabelText("ID"), { target: { value: "owner" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("パスワード（確認）"), { target: { value: "short" } });
    expect(container.querySelector<HTMLFormElement>("form")?.checkValidity()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを作成" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});