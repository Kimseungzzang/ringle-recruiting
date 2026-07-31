import { apiFetch } from "./client";
import type { Topic, TopicDetail } from "../types/api";

// docs/api/topics.md
export const topicsApi = {
  list() {
    return apiFetch<Topic[]>("/topics");
  },

  get(id: number) {
    return apiFetch<TopicDetail>(`/topics/${id}`);
  },
};
