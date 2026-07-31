import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StudyPage from "./StudyPage";
import { ApiError } from "../api/client";
import type { Topic } from "../types/api";

vi.mock("../api/topics");
import { topicsApi } from "../api/topics";

const topicsApiMock = vi.mocked(topicsApi);

const topics: Topic[] = [
  { id: 6, title: "자기소개하기", title_en: "Introducing One's Name and Role at Work" },
  { id: 7, title: "비즈니스 미팅", title_en: "Leading a Business Meeting" },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <StudyPage />
    </MemoryRouter>,
  );
}

describe("StudyPage", () => {
  it("주제 목록을 불러와 각 주제로 가는 링크를 렌더링한다", async () => {
    topicsApiMock.list.mockResolvedValue(topics);

    renderPage();

    expect(await screen.findByText("자기소개하기")).toBeInTheDocument();
    expect(screen.getByText("비즈니스 미팅")).toBeInTheDocument();
    expect(screen.getByText("Introducing One's Name and Role at Work")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자기소개하기" })).toHaveAttribute("href", "/study/6");
    expect(screen.getByRole("link", { name: "비즈니스 미팅" })).toHaveAttribute("href", "/study/7");
  });

  it("불러오기 실패하면 에러 메시지를 보여준다", async () => {
    topicsApiMock.list.mockRejectedValue(new ApiError(500, null));

    renderPage();

    expect(await screen.findByText("request failed with status 500")).toBeInTheDocument();
  });
});
