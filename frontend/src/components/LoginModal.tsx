import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

// 로그인 전용 페이지 대신 어디서든 띄우는 모달. AppLayout에 한 번만
// 마운트해두고 isLoginModalOpen으로 열고 닫는다 — 성공하면 페이지 이동 없이
// 그 자리에서 닫히고, 각 화면은 currentMember 변화에 반응해서 알아서
// 다시 렌더링된다.
export default function LoginModal() {
  const { login, isLoginModalOpen, closeLoginModal } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoginModalOpen) {
      setLoginId("");
      setPassword("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isLoginModalOpen]);

  useEffect(() => {
    if (!isLoginModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLoginModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoginModalOpen, closeLoginModal]);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(loginId, password);
      closeLoginModal();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={closeLoginModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-6 rounded-xl bg-white p-8 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="login-modal-title" className="text-xl font-bold text-gray-900">
              로그인
            </h2>
            <p className="mt-1 text-sm text-gray-500">아이디와 비밀번호를 입력해주세요</p>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            아이디
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="login_id"
              autoFocus
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
