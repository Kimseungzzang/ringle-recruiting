// Thin fetch wrapper shared by all api/*.ts modules. Requests go through the
// Vite dev proxy (vite.config.ts: /api -> http://localhost:3000), so the
// browser sees everything as same-origin and cookies flow automatically.
export class ApiError extends Error {
  status: number;
  code: string | null;
  body: unknown;

  constructor(status: number, body: unknown) {
    // 백엔드 에러 응답은 { code, message } 형태 (api.md 참고).
    const hasMessage = typeof body === "object" && body !== null && "message" in body;
    const message = hasMessage
      ? String((body as { message: unknown }).message)
      : `request failed with status ${status}`;
    const hasCode = typeof body === "object" && body !== null && "code" in body;

    super(message);
    this.status = status;
    this.code = hasCode ? String((body as { code: unknown }).code) : null;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}
