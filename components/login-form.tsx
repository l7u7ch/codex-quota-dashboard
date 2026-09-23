"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type LoginFormProps = {
  onAuthenticated?: () => void;
};

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      if (!response.ok) {
        setError("IDまたはパスワードが正しくありません。");
        return;
      }
      if (onAuthenticated) {
        onAuthenticated();
      } else {
        router.push("/");
      }
    } catch {
      setError("ログインできませんでした。時間をおいて再試行してください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="login-id">ID</label>
        <input
          id="login-id"
          name="id"
          autoComplete="username"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setId(event.target.value)}
          required
          value={id}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="login-password">パスワード</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setPassword(event.target.value)}
          required
          value={password}
        />
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? "ログイン中…" : "ログイン"}
      </Button>
    </form>
  );
}
