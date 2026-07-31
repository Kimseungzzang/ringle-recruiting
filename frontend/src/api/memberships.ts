import { apiFetch } from "./client";
import type { Membership } from "../types/api";

// docs/api/memberships.md
export const membershipsApi = {
  list() {
    return apiFetch<Membership[]>("/memberships");
  },

  get(id: number) {
    return apiFetch<Membership>(`/memberships/${id}`);
  },
};
