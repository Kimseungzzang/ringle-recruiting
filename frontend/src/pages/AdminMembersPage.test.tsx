import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminMembersPage from "./AdminMembersPage";
import { ApiError } from "../api/client";
import type { MemberDetail, Membership } from "../types/api";

let currentMember: { role: "user" | "admin" } | null = null;
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ currentMember }),
}));

vi.mock("../api/admin");
vi.mock("../api/memberships");

import { adminApi } from "../api/admin";
import { membershipsApi } from "../api/memberships";

const adminApiMock = vi.mocked(adminApi);
const membershipsApiMock = vi.mocked(membershipsApi);

const basicMembership: Membership = {
  id: 16,
  name: "베이직",
  permissions: ["study"],
  duration_days: 30,
  price: 129_000,
};
const premiumMembership: Membership = {
  id: 17,
  name: "프리미엄",
  permissions: ["study", "converse", "analyze"],
  duration_days: 60,
  price: 219_000,
};

const memberWithoutMembership: MemberDetail = {
  id: 1,
  login_id: "no-membership",
  username: "회원1",
  role: "user",
  membership: null,
};
const memberWithMembership: MemberDetail = {
  id: 2,
  login_id: "has-membership",
  username: "회원2",
  role: "user",
  membership: {
    membership: basicMembership,
    created_at: "2026-02-20T00:00:00.000Z",
    expires_at: "2026-12-31T00:00:00.000Z",
    active: true,
  },
};

describe("AdminMembersPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    currentMember = null;
  });

  it("관리자가 아니면 접근 불가 메시지를 보여주고 목록을 불러오지 않는다", () => {
    currentMember = { role: "user" };

    render(<AdminMembersPage />);

    expect(screen.getByText("관리자만 접근할 수 있는 페이지입니다.")).toBeInTheDocument();
    expect(adminApiMock.listMembers).not.toHaveBeenCalled();
  });

  it("관리자면 회원 목록과 보유 멤버십 상태를 보여준다", async () => {
    currentMember = { role: "admin" };
    adminApiMock.listMembers.mockResolvedValue([memberWithoutMembership, memberWithMembership]);
    membershipsApiMock.list.mockResolvedValue([basicMembership, premiumMembership]);

    render(<AdminMembersPage />);

    expect(await screen.findByText("no-membership")).toBeInTheDocument();
    const row = screen.getByText("has-membership").closest("tr");
    if (!row) throw new Error("row not found");
    expect(screen.getByText("없음")).toBeInTheDocument();
    expect(within(row).getByText("베이직", { selector: "span" })).toBeInTheDocument();
    expect(within(row).getByText("이용 중")).toBeInTheDocument();
    // 시작일~만료일 텍스트가 함께 렌더링되는지만 확인(정확한 포맷은 실행
    // 환경 로케일에 따라 달라질 수 있음).
    expect(within(row).getByText(/2026.*~.*2026/)).toBeInTheDocument();
  });

  it("불러오기 실패하면 에러 메시지를 보여준다", async () => {
    currentMember = { role: "admin" };
    adminApiMock.listMembers.mockRejectedValue(new ApiError(500, null));
    membershipsApiMock.list.mockResolvedValue([basicMembership]);

    render(<AdminMembersPage />);

    expect(await screen.findByText("request failed with status 500")).toBeInTheDocument();
  });

  it("부여 버튼을 누르면 선택된 멤버십으로 할당 API를 호출하고 목록을 새로고침한다", async () => {
    currentMember = { role: "admin" };
    adminApiMock.listMembers.mockResolvedValue([memberWithoutMembership]);
    membershipsApiMock.list.mockResolvedValue([basicMembership, premiumMembership]);
    adminApiMock.grantMembership.mockResolvedValue({
      membership: premiumMembership,
      created_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-12-31T00:00:00.000Z",
      active: true,
    });
    const user = userEvent.setup();

    render(<AdminMembersPage />);
    const row = (await screen.findByText("no-membership")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.selectOptions(within(row).getByRole("combobox"), "프리미엄");
    await user.click(within(row).getByRole("button", { name: "부여" }));

    await waitFor(() => expect(adminApiMock.grantMembership).toHaveBeenCalledWith(1, 17));
    expect(adminApiMock.listMembers).toHaveBeenCalledTimes(2);
  });

  it("회수 버튼은 멤버십이 없으면 비활성화되고, 있으면 눌러서 회수할 수 있다", async () => {
    currentMember = { role: "admin" };
    adminApiMock.listMembers.mockResolvedValue([memberWithoutMembership, memberWithMembership]);
    membershipsApiMock.list.mockResolvedValue([basicMembership]);
    adminApiMock.revokeMembership.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<AdminMembersPage />);

    const rowWithout = (await screen.findByText("no-membership")).closest("tr");
    const rowWith = screen.getByText("has-membership").closest("tr");
    if (!rowWithout || !rowWith) throw new Error("rows not found");

    expect(within(rowWithout).getByRole("button", { name: "회수" })).toBeDisabled();

    await user.click(within(rowWith).getByRole("button", { name: "회수" }));

    await waitFor(() => expect(adminApiMock.revokeMembership).toHaveBeenCalledWith(2));
  });

  it("할당/회수 실패하면 에러 메시지를 보여준다", async () => {
    currentMember = { role: "admin" };
    adminApiMock.listMembers.mockResolvedValue([memberWithMembership]);
    membershipsApiMock.list.mockResolvedValue([basicMembership]);
    adminApiMock.revokeMembership.mockRejectedValue(
      new ApiError(422, { code: "NO_ACTIVE_MEMBERSHIP", message: "보유 중인 멤버십이 없습니다." }),
    );
    const user = userEvent.setup();

    render(<AdminMembersPage />);
    const row = (await screen.findByText("has-membership")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("button", { name: "회수" }));

    expect(await screen.findByText("보유 중인 멤버십이 없습니다.")).toBeInTheDocument();
  });
});
