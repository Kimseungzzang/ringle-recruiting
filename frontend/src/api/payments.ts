import { apiFetch } from "./client";
import type { MemberMembership } from "../types/api";

// docs/api/payments.md
export const paymentsApi = {
  create(membershipId: number) {
    return apiFetch<MemberMembership>("/payments", {
      method: "POST",
      body: { membership_id: membershipId },
    });
  },
};
