import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ApiError", () => {
  it("백엔드 { code, message } 형태의 응답에서 메시지와 코드를 뽑아낸다", () => {
    const error = new ApiError(422, { code: "VALIDATION_ERROR", message: "이름은 필수입니다." });

    expect(error.status).toBe(422);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("이름은 필수입니다.");
  });

  it("message/code가 없는 응답이면 상태 코드 기반 기본 메시지를 쓰고 code는 null이다", () => {
    const error = new ApiError(500, null);

    expect(error.code).toBeNull();
    expect(error.message).toBe("request failed with status 500");
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("/api/v1 프리픽스를 붙이고 credentials: include로 요청한다", async () => {
    const fetchMock = mockFetchOnce({
      status: 200,
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: 1 }),
    });

    const result = await apiFetch<{ id: number }>("/topics/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/topics/1",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
    expect(result).toEqual({ id: 1 });
  });

  it("body가 있으면 JSON으로 직렬화하고 Content-Type을 붙인다", async () => {
    const fetchMock = mockFetchOnce({
      status: 200,
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ ok: true }),
    });

    await apiFetch("/payments", { method: "POST", body: { membership_id: 3 } });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/payments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ membership_id: 3 }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("204 No Content면 undefined를 반환한다", async () => {
    mockFetchOnce({ status: 204, ok: true, headers: new Headers() });

    const result = await apiFetch("/session", { method: "DELETE" });

    expect(result).toBeUndefined();
  });

  it("실패 응답이면 파싱한 body로 ApiError를 던진다", async () => {
    mockFetchOnce({
      status: 401,
      ok: false,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }),
    });

    await expect(apiFetch("/members/1")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    });
  });
});
