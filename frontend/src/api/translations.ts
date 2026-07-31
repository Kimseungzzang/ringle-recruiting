import { apiFetch } from "./client";
import type { Translation } from "../types/api";

// api.md 참고
export const translationsApi = {
  translate(text: string) {
    return apiFetch<Translation>("/translations", {
      method: "POST",
      body: { text },
    });
  },
};
