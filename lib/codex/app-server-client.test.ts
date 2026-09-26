import { once } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";

import { JsonRpcConnection } from "@/lib/codex/app-server-client";

function createLineReader(stream: PassThrough) {
  stream.setEncoding("utf8");
  let buffer = "";
  return async () => {
    while (!buffer.includes("\n")) {
      const chunk = stream.read();
      if (chunk === null) await once(stream, "readable");
      else buffer += chunk;
    }
    const newline = buffer.indexOf("\n");
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    return JSON.parse(line);
  };
}

describe("JsonRpcConnection", () => {
  it("initializes and resolves matching JSON-RPC responses", async () => {
    const fromServer = new PassThrough();
    const toServer = new PassThrough();
    const nextLine = createLineReader(toServer);
    const connection = new JsonRpcConnection(fromServer, toServer);

    const initialization = connection.initialize();
    const initializeRequest = await nextLine();
    expect(initializeRequest.method).toBe("initialize");
    expect(initializeRequest.params.clientInfo).toEqual({
      name: "ai_usage_monitor",
      title: "AI Usage Monitor",
      version: "0.1.0",
    });
    fromServer.write(`${JSON.stringify({ id: initializeRequest.id, result: { userAgent: "codex" } })}\n`);
    await initialization;

    const initializedNotification = await nextLine();
    expect(initializedNotification).toEqual({ method: "initialized", params: {} });

    const request = connection.request("account/rateLimits/read");
    const message = await nextLine();
    fromServer.write(`${JSON.stringify({ id: message.id, result: { rateLimits: null } })}\n`);

    await expect(request).resolves.toEqual({ rateLimits: null });
    connection.close();
  });

  it("surfaces JSON-RPC errors without leaking raw payloads", async () => {
    const fromServer = new PassThrough();
    const toServer = new PassThrough();
    const nextLine = createLineReader(toServer);
    const connection = new JsonRpcConnection(fromServer, toServer);

    const request = connection.request("account/read");
    const message = await nextLine();
    fromServer.write(`${JSON.stringify({ id: message.id, error: { code: 401, message: "secret upstream detail" } })}\n`);

    await expect(request).rejects.toThrow("Codex App Server request failed (401)");
    connection.close();
  });
});
