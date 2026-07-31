import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginModal from "./LoginModal";
import { ApiError } from "../api/client";

const loginMock = vi.fn();
const closeLoginModalMock = vi.fn();
let isLoginModalOpen = true;

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    isLoginModalOpen,
    closeLoginModal: closeLoginModalMock,
  }),
}));

describe("LoginModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
    isLoginModalOpen = true;
  });

  it("isLoginModalOpen이 false면 아무것도 렌더링하지 않는다", () => {
    isLoginModalOpen = false;
    const { container } = render(<LoginModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("로그인에 성공하면 모달을 닫는다", async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginModal />);

    await user.type(screen.getByPlaceholderText("login_id"), "tester1234");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(loginMock).toHaveBeenCalledWith("tester1234", "password123");
    expect(closeLoginModalMock).toHaveBeenCalled();
  });

  it("로그인에 실패하면 에러 메시지를 보여주고 모달을 닫지 않는다", async () => {
    loginMock.mockRejectedValue(
      new ApiError(401, { code: "INVALID_CREDENTIALS", message: "아이디 또는 비밀번호가 올바르지 않습니다." }),
    );
    const user = userEvent.setup();
    render(<LoginModal />);

    await user.type(screen.getByPlaceholderText("login_id"), "tester1234");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByText("아이디 또는 비밀번호가 올바르지 않습니다.")).toBeInTheDocument();
    expect(closeLoginModalMock).not.toHaveBeenCalled();
  });

  it("배경(오버레이)을 클릭하면 모달을 닫는다", async () => {
    const user = userEvent.setup();
    render(<LoginModal />);

    await user.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(closeLoginModalMock).toHaveBeenCalled();
  });

  it("닫기 버튼을 클릭하면 모달을 닫는다", async () => {
    const user = userEvent.setup();
    render(<LoginModal />);

    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(closeLoginModalMock).toHaveBeenCalled();
  });
});
