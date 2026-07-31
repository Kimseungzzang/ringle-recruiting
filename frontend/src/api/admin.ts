import { apiFetch } from "./client";
import type { MemberDetail, MemberMembership } from "../types/api";

// api.md (GET /api/v1/admin/members, POST|DELETE /api/v1/admin/members/:member_id/membership)
export const adminApi = {
  listMembers() {
    return apiFetch<MemberDetail[]>("/admin/members");
  },

  grantMembership(memberId: number, membershipId: number) {
    return apiFetch<MemberMembership>(`/admin/members/${memberId}/membership`, {
      method: "POST",
      body: { membership_id: membershipId },
    });
  },

  revokeMembership(memberId: number) {
    return apiFetch<void>(`/admin/members/${memberId}/membership`, { method: "DELETE" });
  },
};
