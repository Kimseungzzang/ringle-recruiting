import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginModal from "../components/LoginModal";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-violet-100 text-violet-700"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

export default function AppLayout() {
  const { currentMember, isLoading, logout, openLoginModal } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    // 로그인이 더 이상 별도 페이지가 아니라 모달이라, 로그아웃 후에는
    // 누구나 볼 수 있는 홈으로 보내면 됨(그 자리에서 다시 로그인 버튼을
    // 누르면 됨).
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="text-lg font-bold text-violet-700">
            Ringle AI 튜터
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/study" className={navLinkClass}>
              학습
            </NavLink>
            <NavLink to="/membership/purchase" className={navLinkClass}>
              이용권 구매
            </NavLink>
            <NavLink to="/mypage" className={navLinkClass}>
              마이페이지
            </NavLink>
            {currentMember?.role === "admin" && (
              <NavLink to="/admin/members" className={navLinkClass}>
                멤버십 관리
              </NavLink>
            )}
            {isLoading ? null : currentMember ? (
              <>
                <span className="ml-2 text-sm text-gray-500">
                  {currentMember.username}님
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openLoginModal}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                로그인
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <LoginModal />
    </div>
  );
}
