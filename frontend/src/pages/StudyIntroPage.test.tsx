import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StudyIntroPage from "./StudyIntroPage";
import { ApiError } from "../api/client";
import type { MemberDetail, MemberMembership, TopicDetail } from "../types/api";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

let currentMember: MemberDetail | null = null;
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ currentMember }),
}));

vi.mock("../api/topics");
import { topicsApi } from "../api/topics";

const topicsApiMock = vi.mocked(topicsApi);

const topic: TopicDetail = {
  id: 6,
  title: "자기소개하기",
  title_en: "Introducing One's Name and Role at Work",
  paragraphs: [
    {
      id: 1,
      position: 0,
      translations: {
        ko: "새로운 사람을 만나는 비즈니스 환경에서 본인을 소개해보세요.",
        eng: "Introduce yourself in a business setting where you meet someone new.",
      },
    },
  ],
};

function membershipOf(overrides: Partial<MemberMembership>): MemberMembership {
  return {
    membership: { id: 17, name: "프리미엄", permissions: ["converse"], duration_days: 60, price: 219_000 },
    created_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-12-31T00:00:00.000Z",
    active: true,
    ...overrides,
  };
}

function memberWith(membership: MemberMembership | null): MemberDetail {
  return {
    id: 1,
    login_id: "tester",
    username: "테스터",
    role: "user",
    membership,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/study/6"]}>
      <Routes>
        <Route path="/study/:topicId" element={<StudyIntroPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StudyIntroPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    currentMember = null;
  });

  it("불러오는 중에는 로딩 텍스트를 보여준다", () => {
    topicsApiMock.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("불러오는 중...")).toBeInTheDocument();
  });

  it("주제 조회에 실패하면 에러와 목록으로 돌아가는 링크를 보여준다", async () => {
    topicsApiMock.get.mockRejectedValue(new ApiError(404, { code: "TOPIC_NOT_FOUND", message: "주제를 찾을 수 없습니다." }));

    renderPage();

    expect(await screen.findByText("주제를 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← 학습 목록으로" })).toHaveAttribute("href", "/study");
  });

  it("제목/영문 부제/첫 문단 시나리오를 보여준다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);

    renderPage();

    expect(await screen.findByText("자기소개하기")).toBeInTheDocument();
    expect(screen.getByText("Introducing One's Name and Role at Work")).toBeInTheDocument();
    expect(screen.getByText("새로운 사람을 만나는 비즈니스 환경에서 본인을 소개해보세요.")).toBeInTheDocument();
  });

  it("converse 권한이 있는 활성 멤버십이면 대화 화면으로 이동한다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);
    currentMember = memberWith(membershipOf({}));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "대화 시작하기" }));

    expect(navigateMock).toHaveBeenCalledWith("/study/6/conversation");
  });

  it("로그인하지 않았으면(멤버십 없음) 팝업을 띄우고 이동하지 않는다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);
    currentMember = null;
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "대화 시작하기" }));

    expect(screen.getByText("멤버십이 필요합니다")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("converse 권한이 없는 멤버십(예: study만 있는 베이직)이면 팝업을 띄운다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);
    currentMember = memberWith(
      membershipOf({ membership: { id: 16, name: "베이직", permissions: ["study"], duration_days: 30, price: 129_000 } }),
    );
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "대화 시작하기" }));

    expect(screen.getByText("멤버십이 필요합니다")).toBeInTheDocument();
  });

  it("만료된 멤버십이면 converse 권한이 있어도 팝업을 띄운다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);
    currentMember = memberWith(membershipOf({ active: false }));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "대화 시작하기" }));

    expect(screen.getByText("멤버십이 필요합니다")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("팝업에서 '멤버십 구매하러 가기'를 누르면 구매 페이지로 이동한다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);
    currentMember = null;
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "대화 시작하기" }));
    await user.click(screen.getByRole("button", { name: "멤버십 구매하러 가기" }));

    expect(navigateMock).toHaveBeenCalledWith("/membership/purchase");
  });

  it("AI 목소리를 선택하면 localStorage에 저장된다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "marin" }));

    expect(localStorage.getItem("ringle-voice-preference")).toBe("marin");
    expect(screen.getByRole("button", { name: "marin" })).toHaveAttribute("aria-pressed", "true");
  });

  it("팝업에서 '닫기'를 누르면 팝업이 사라진다", async () => {
    topicsApiMock.get.mockResolvedValue(topic);
    currentMember = null;
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "대화 시작하기" }));
    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByText("멤버십이 필요합니다")).not.toBeInTheDocument();
  });
});
