import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../createApp.js";

describe("HTTP API", () => {
  const appPromise = createApp();
  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const app = await appPromise;
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("GET /cars rejects invalid limit", async () => {
    const app = await appPromise;
    const res = await app.inject({ method: "GET", url: "/cars?limit=999" });
    expect(res.statusCode).toBe(400);
  });

  it("POST /cars/:id/reports requires auth", async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: "POST",
      url: "/cars/00000000-0000-4000-8000-000000000000/reports",
      headers: { "content-type": "application/json" },
      payload: { message: "test" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /auth/anonymous creates user when DB available", async () => {
    if (!process.env["DATABASE_URL"] && !process.env["CI"]) {
      return;
    }
    const app = await appPromise;
    const res = await app.inject({ method: "POST", url: "/auth/anonymous" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { token: string; user_id: string };
    expect(body.token).toBeTruthy();
    expect(body.user_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
