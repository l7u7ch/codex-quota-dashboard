"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SetupForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("パスワードが一致しません。");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      if (!response.ok) {
        setError(
          response.status === 409
            ? "アカウントは既に作成されています。ログインしてください。"
            : "アカウントを作成できませんでした。入力を確認してください。",
        );
        setSubmitting(false);
        return;
      }
      router.push("/");
    } catch {
      setError(
        "アカウントを作成できませんでした。時間をおいて再試行してください。",
      );
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <form className="space-y-5" onSubmit={submit}>
      {/* <h1 className="text-xl font-semibold">初期アカウント作成</h1> */}
      {/* <p className="text-sm text-muted-foreground">最初の管理者アカウントを作成してください。</p> */}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="setup-id">
          ID
        </label>
        <input
          id="setup-id"
          name="id"
          autoComplete="username"
          className={inputClass}
          pattern="[A-Za-z0-9_.-]+"
          maxLength={64}
          onChange={(event) => setId(event.target.value)}
          required
          value={id}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="setup-password">
          パスワード
        </label>
        <input
          id="setup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          maxLength={1024}
          onChange={(event) => setPassword(event.target.value)}
          required
          value={password}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="setup-confirmation">
          パスワード（確認）
        </label>
        <input
          id="setup-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          value={confirmation}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? "作成中…" : "アカウントを作成"}
      </Button>
    </form>
  );
}
