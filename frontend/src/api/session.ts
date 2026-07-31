import { apiFetch } from "./client";
import type { Member } from "../types/api";

// api.md (POST/DELETE /api/v1/session)
export const sessionApi = {
  login(loginId: string, password: string) {
    return apiFetch<{ member: Member }>("/session", {
      method: "POST",
      body: { login_id: loginId, password },
    });
  },

  logout() {
    return apiFetch<void>("/session", { method: "DELETE" });
  },
};
