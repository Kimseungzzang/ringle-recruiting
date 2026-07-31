import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MyPage from "./MyPage";
import type { MemberDetail } from "../types/api";

let mockAuthState: { currentMember: MemberDetail | null; isLoading: boolean } = {
  currentMember: null,
  isLoading: false,
};
const openLoginModalMock = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ ...mockAuthState, openLoginModal: openLoginModalMock }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <MyPage />
    </MemoryRouter>,
  );
}

describe("MyPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("로딩 중이면 로딩 텍스트를 보여준다", () => {
    mockAuthState = { currentMember: null, isLoading: true };
    renderPage();
    expect(screen.getByText("불러오는 중...")).toBeInTheDocument();
  });

  it("로그인 안 됐으면 로그인 모달을 여는 버튼을 보여준다", async () => {
    mockAuthState = { currentMember: null, isLoading: false };
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("로그인이 필요합니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "로그인하러 가기 →" }));
    expect(openLoginModalMock).toHaveBeenCalled();
  });

  it("멤버십이 없으면 구매 유도 링크와 함께 회원 정보를 보여준다", () => {
    mockAuthState = {
      isLoading: false,
      currentMember: {
        id: 1,
        login_id: "tester",
        username: "테스터",
        role: "user",
        membership: null,
      },
    };
    renderPage();

    expect(screen.getByText("tester")).toBeInTheDocument();
    expect(screen.getByText("테스터")).toBeInTheDocument();
    expect(screen.getByText("보유 중인 멤버십이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "구매하러 가기 →" })).toHaveAttribute(
      "href",
      "/membership/purchase",
    );
  });

  it("활성 멤버십이 있으면 이용 중 배지와 권한 목록을 보여준다", () => {
    mockAuthState = {
      isLoading: false,
      currentMember: {
        id: 1,
        login_id: "tester",
        username: "테스터",
        role: "user",
        membership: {
          membership: { id: 17, name: "프리미엄", permissions: ["study", "converse"], duration_days: 60, price: 219_000 },
          created_at: "2026-01-01T00:00:00.000Z",
          expires_at: "2026-12-31T00:00:00.000Z",
          active: true,
        },
      },
    };
    renderPage();

    expect(screen.getByText("프리미엄")).toBeInTheDocument();
    expect(screen.getByText("이용 중")).toBeInTheDocument();
    expect(screen.getByText("학습")).toBeInTheDocument();
    expect(screen.getByText("대화")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "구매하러 가기 →" })).not.toBeInTheDocument();
  });

  it("만료된 멤버십이면 만료됨 배지와 구매 유도 링크를 같이 보여준다", () => {
    mockAuthState = {
      isLoading: false,
      currentMember: {
        id: 1,
        login_id: "tester",
        username: "테스터",
        role: "user",
        membership: {
          membership: { id: 16, name: "베이직", permissions: ["study"], duration_days: 30, price: 129_000 },
          created_at: "2019-12-01T00:00:00.000Z",
          expires_at: "2020-01-01T00:00:00.000Z",
          active: false,
        },
      },
    };
    renderPage();

    expect(screen.getByText("만료됨")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "구매하러 가기 →" })).toBeInTheDocument();
  });
});
