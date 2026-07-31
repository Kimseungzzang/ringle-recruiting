import { describe, expect, it, vi } from "vitest";

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, apiFetch: vi.fn() };
});

import { apiFetch } from "./client";
import { sessionApi } from "./session";
import { membersApi } from "./members";
import { membershipsApi } from "./memberships";
import { paymentsApi } from "./payments";
import { topicsApi } from "./topics";
import { realtimeSessionsApi } from "./realtimeSessions";
import { translationsApi } from "./translations";

const apiFetchMock = vi.mocked(apiFetch);

describe("얇은 api/*.ts 래퍼들이 apiFetch를 올바른 인자로 호출한다", () => {
  it("sessionApi.login", () => {
    sessionApi.login("tester", "password123");
    expect(apiFetchMock).toHaveBeenCalledWith("/session", {
      method: "POST",
      body: { login_id: "tester", password: "password123" },
    });
  });

  it("sessionApi.logout", () => {
    sessionApi.logout();
    expect(apiFetchMock).toHaveBeenCalledWith("/session", { method: "DELETE" });
  });

  it("membersApi.get", () => {
    membersApi.get(7);
    expect(apiFetchMock).toHaveBeenCalledWith("/members/7");
  });

  it("membershipsApi.list / get", () => {
    membershipsApi.list();
    expect(apiFetchMock).toHaveBeenCalledWith("/memberships");

    membershipsApi.get(3);
    expect(apiFetchMock).toHaveBeenCalledWith("/memberships/3");
  });

  it("paymentsApi.create", () => {
    paymentsApi.create(5);
    expect(apiFetchMock).toHaveBeenCalledWith("/payments", {
      method: "POST",
      body: { membership_id: 5 },
    });
  });

  it("topicsApi.list / get", () => {
    topicsApi.list();
    expect(apiFetchMock).toHaveBeenCalledWith("/topics");

    topicsApi.get(6);
    expect(apiFetchMock).toHaveBeenCalledWith("/topics/6");
  });

  it("realtimeSessionsApi.create", () => {
    realtimeSessionsApi.create();
    expect(apiFetchMock).toHaveBeenCalledWith("/realtime_sessions", { method: "POST", body: undefined });
  });

  it("realtimeSessionsApi.create(voice)", () => {
    realtimeSessionsApi.create("marin");
    expect(apiFetchMock).toHaveBeenCalledWith("/realtime_sessions", {
      method: "POST",
      body: { voice: "marin" },
    });
  });

  it("translationsApi.translate", () => {
    translationsApi.translate("Nice to meet you.");
    expect(apiFetchMock).toHaveBeenCalledWith("/translations", {
      method: "POST",
      body: { text: "Nice to meet you." },
    });
  });
});
