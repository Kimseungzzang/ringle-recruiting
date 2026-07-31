import { apiFetch } from "./client";
import type { MemberDetail } from "../types/api";

// api.md (GET /api/v1/members/:id)
export const membersApi = {
  get(id: number) {
    return apiFetch<MemberDetail>(`/members/${id}`);
  },
};
