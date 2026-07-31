import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import { ApiError } from "../api/client";
import type { MemberDetail } from "../types/api";

vi.mock("../api/session");
vi.mock("../api/members");

import { sessionApi } from "../api/session";
import { membersApi } from "../api/members";

const sessionApiMock = vi.mocked(sessionApi);
const membersApiMock = vi.mocked(membersApi);

const MEMBER_ID_STORAGE_KEY = "ringle-member-id";

function buildMember(overrides: Partial<MemberDetail> = {}): MemberDetail {
  return {
    id: 1,
    login_id: "tester",
    username: "테스터",
    role: "user",
    membership: null,
    ...overrides,
  };
}

function Consumer() {
  const { currentMember, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="member">{currentMember ? currentMember.username : "none"}</span>
      <button onClick={() => void login("tester", "password123")}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("저장된 id가 없으면 로그인 안 된 상태로 로딩을 끝낸다", async () => {
    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("member")).toHaveTextContent("none");
    expect(membersApiMock.get).not.toHaveBeenCalled();
  });

  it("저장된 id가 있으면 본인 정보를 조회해 로그인 상태를 복원한다", async () => {
    window.localStorage.setItem(MEMBER_ID_STORAGE_KEY, "42");
    membersApiMock.get.mockResolvedValue(buildMember({ id: 42, username: "복원됨" }));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId("member")).toHaveTextContent("복원됨"));
    expect(membersApiMock.get).toHaveBeenCalledWith(42);
  });

  it("저장된 id로 조회했는데 ApiError(세션 만료 등)면 저장값을 지우고 로그아웃 상태로 취급한다", async () => {
    window.localStorage.setItem(MEMBER_ID_STORAGE_KEY, "42");
    membersApiMock.get.mockRejectedValue(new ApiError(403, { code: "FORBIDDEN", message: "만료" }));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("member")).toHaveTextContent("none");
    expect(window.localStorage.getItem(MEMBER_ID_STORAGE_KEY)).toBeNull();
  });

  it("login()은 세션을 만들고 내 id를 저장한 뒤 본인 정보를 불러온다", async () => {
    const user = userEvent.setup();
    sessionApiMock.login.mockResolvedValue({ member: { id: 1, login_id: "tester", username: "테스터" } });
    membersApiMock.get.mockResolvedValue(buildMember());

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("login"));

    await waitFor(() => expect(screen.getByTestId("member")).toHaveTextContent("테스터"));
    expect(sessionApiMock.login).toHaveBeenCalledWith("tester", "password123");
    expect(window.localStorage.getItem(MEMBER_ID_STORAGE_KEY)).toBe("1");
  });

  it("logout()은 세션을 지우고 저장값과 상태를 초기화한다", async () => {
    window.localStorage.setItem(MEMBER_ID_STORAGE_KEY, "1");
    membersApiMock.get.mockResolvedValue(buildMember());
    sessionApiMock.logout.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("member")).toHaveTextContent("테스터"));

    await user.click(screen.getByText("logout"));

    await waitFor(() => expect(screen.getByTestId("member")).toHaveTextContent("none"));
    expect(sessionApiMock.logout).toHaveBeenCalled();
    expect(window.localStorage.getItem(MEMBER_ID_STORAGE_KEY)).toBeNull();
  });

  it("logout()은 대화 기록 등 다른 ringle- 접두사 localStorage 키도 모두 지운다", async () => {
    window.localStorage.setItem(MEMBER_ID_STORAGE_KEY, "1");
    window.localStorage.setItem("ringle-conversation-6", JSON.stringify([{ id: "1", role: "user", text: "hi" }]));
    window.localStorage.setItem("ringle-voice-preference", "alloy");
    window.localStorage.setItem("unrelated-key", "keep me");
    membersApiMock.get.mockResolvedValue(buildMember());
    sessionApiMock.logout.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("member")).toHaveTextContent("테스터"));

    await user.click(screen.getByText("logout"));

    await waitFor(() => expect(screen.getByTestId("member")).toHaveTextContent("none"));
    expect(window.localStorage.getItem("ringle-conversation-6")).toBeNull();
    expect(window.localStorage.getItem("ringle-voice-preference")).toBeNull();
    // ringle- 접두사가 아닌 키는 건드리면 안 됨.
    expect(window.localStorage.getItem("unrelated-key")).toBe("keep me");
  });
});
