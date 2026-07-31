import { apiFetch } from "./client";
import type { RealtimeSession } from "../types/api";

// api.md 참고
export const realtimeSessionsApi = {
  create(voice?: string) {
    return apiFetch<RealtimeSession>("/realtime_sessions", {
      method: "POST",
      body: voice ? { voice } : undefined,
    });
  },
};
