import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipPurchasePage from "./MembershipPurchasePage";
import { ApiError } from "../api/client";
import type { Membership, MemberDetail } from "../types/api";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const refreshMock = vi.fn();
const openLoginModalMock = vi.fn();
let currentMember: Pick<MemberDetail, "id" | "membership"> | null = null;
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ currentMember, refresh: refreshMock, openLoginModal: openLoginModalMock }),
}));

vi.mock("../api/memberships");
vi.mock("../api/payments");

import { membershipsApi } from "../api/memberships";
import { paymentsApi } from "../api/payments";

const membershipsApiMock = vi.mocked(membershipsApi);
const paymentsApiMock = vi.mocked(paymentsApi);

const membership: Membership = {
  id: 17,
  name: "프리미엄",
  permissions: ["study", "converse", "analyze"],
  duration_days: 60,
  price: 219_000,
};

describe("MembershipPurchasePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    currentMember = null;
  });

  it("멤버십 목록을 불러와 이름/가격/권한을 보여준다", async () => {
    membershipsApiMock.list.mockResolvedValue([membership]);

    render(<MembershipPurchasePage />);

    expect(await screen.findByText("프리미엄")).toBeInTheDocument();
    expect(screen.getByText("219,000원")).toBeInTheDocument();
    expect(screen.getByText("학습")).toBeInTheDocument();
    expect(screen.getByText("대화")).toBeInTheDocument();
    expect(screen.getByText("분석")).toBeInTheDocument();
  });

  it("로그인 안 된 상태에서 구매를 누르면 로그인 모달을 열고 결제 API는 호출하지 않는다", async () => {
    currentMember = null;
    membershipsApiMock.list.mockResolvedValue([membership]);
    const user = userEvent.setup();

    render(<MembershipPurchasePage />);
    await user.click(await screen.findByRole("button", { name: "구매" }));

    expect(openLoginModalMock).toHaveBeenCalled();
    expect(paymentsApiMock.create).not.toHaveBeenCalled();
  });

  it("로그인 상태에서 구매하면 결제 후 내 정보 새로고침하고 마이페이지로 이동한다", async () => {
    currentMember = { id: 1, membership: null };
    membershipsApiMock.list.mockResolvedValue([membership]);
    paymentsApiMock.create.mockResolvedValue({
      membership,
      created_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-12-31T00:00:00.000Z",
      active: true,
    });
    const user = userEvent.setup();

    render(<MembershipPurchasePage />);
    await user.click(await screen.findByRole("button", { name: "구매" }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/mypage"));
    expect(paymentsApiMock.create).toHaveBeenCalledWith(17);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("결제 실패하면 에러 메시지를 보여주고 이동하지 않는다", async () => {
    currentMember = { id: 1, membership: null };
    membershipsApiMock.list.mockResolvedValue([membership]);
    paymentsApiMock.create.mockRejectedValue(
      new ApiError(402, { code: "PAYMENT_FAILED", message: "결제에 실패했습니다." }),
    );
    const user = userEvent.setup();

    render(<MembershipPurchasePage />);
    await user.click(await screen.findByRole("button", { name: "구매" }));

    expect(await screen.findByText("결제에 실패했습니다.")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith("/mypage");
  });

  it("이미 다른 플랜의 활성 멤버십이 있으면 구매 전에 전환 확인 팝업을 띄우고, 바로 결제하지 않는다", async () => {
    const basicMembership: Membership = {
      id: 16,
      name: "베이직",
      permissions: ["study"],
      duration_days: 30,
      price: 129_000,
    };
    currentMember = {
      id: 1,
      membership: {
        membership: basicMembership,
        created_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2026-12-31T00:00:00.000Z",
        active: true,
      },
    };
    membershipsApiMock.list.mockResolvedValue([membership]);
    const user = userEvent.setup();

    render(<MembershipPurchasePage />);
    await user.click(await screen.findByRole("button", { name: "구매" }));

    expect(screen.getByText("다른 멤버십으로 전환하시겠어요?")).toBeInTheDocument();
    expect(paymentsApiMock.create).not.toHaveBeenCalled();
  });

  it("전환 확인 팝업에서 '계속 구매하기'를 누르면 결제를 진행한다", async () => {
    const basicMembership: Membership = {
      id: 16,
      name: "베이직",
      permissions: ["study"],
      duration_days: 30,
      price: 129_000,
    };
    currentMember = {
      id: 1,
      membership: {
        membership: basicMembership,
        created_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2026-12-31T00:00:00.000Z",
        active: true,
      },
    };
    membershipsApiMock.list.mockResolvedValue([membership]);
    paymentsApiMock.create.mockResolvedValue({
      membership,
      created_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-12-31T00:00:00.000Z",
      active: true,
    });
    const user = userEvent.setup();

    render(<MembershipPurchasePage />);
    await user.click(await screen.findByRole("button", { name: "구매" }));
    await user.click(screen.getByRole("button", { name: "계속 구매하기" }));

    await waitFor(() => expect(paymentsApiMock.create).toHaveBeenCalledWith(17));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/mypage"));
  });

  it("전환 확인 팝업에서 '취소'를 누르면 팝업만 닫히고 결제하지 않는다", async () => {
    const basicMembership: Membership = {
      id: 16,
      name: "베이직",
      permissions: ["study"],
      duration_days: 30,
      price: 129_000,
    };
    currentMember = {
      id: 1,
      membership: {
        membership: basicMembership,
        created_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2026-12-31T00:00:00.000Z",
        active: true,
      },
    };
    membershipsApiMock.list.mockResolvedValue([membership]);
    const user = userEvent.setup();

    render(<MembershipPurchasePage />);
    await user.click(await screen.findByRole("button", { name: "구매" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByText("다른 멤버십으로 전환하시겠어요?")).not.toBeInTheDocument();
    expect(paymentsApiMock.create).not.toHaveBeenCalled();
  });

  it("같은 플랜을 재구매하는 경우엔 전환 확인 팝업 없이 바로 결제한다", async () => {
    currentMember = {
      id: 1,
      membership: {
        membership,
        created_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2026-12-31T00:00:00.000Z",
        active: true,
      },
    };
    membershipsApiMock.list.mockResolvedValue([membership]);
    paymentsApiMock.create.mockResolvedValue({
      membership,
      created_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-12-31T00:00:00.000Z",
      active: true,
    });
    const user = userEvent.setup();

    render(<MembershipPurchasePage />);
    await user.click(await screen.findByRole("button", { name: "구매" }));

    expect(screen.queryByText("다른 멤버십으로 전환하시겠어요?")).not.toBeInTheDocument();
    await waitFor(() => expect(paymentsApiMock.create).toHaveBeenCalledWith(17));
  });
});
