import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { sessionApi } from "../api/session";
import { membersApi } from "../api/members";
import { ApiError } from "../api/client";
import type { MemberDetail } from "../types/api";

// 세션 쿠키는 httponly라 JS로 읽을 수 없음. 로그인 응답으로 받은 내 id만
// localStorage에 기억해뒀다가, 새로고침 시 그 id로 GET /members/:id
// (본인 조회는 허용됨)를 다시 호출해서 로그인 상태를 복원한다.
const MEMBER_ID_STORAGE_KEY = "ringle-member-id";

interface AuthContextValue {
  currentMember: MemberDetail | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  // 로그인을 별도 페이지가 아니라 어디서든 띄울 수 있는 모달로 처리하기
  // 위한 상태 — 로그인이 필요한 액션(구매, 마이페이지 진입 등)을 시도한
  // 자리에서 그대로 모달을 열고, 로그인 후에도 페이지 이동 없이 이어감.
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentMember, setCurrentMember] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);

  const loadMember = useCallback(async (id: number) => {
    try {
      const member = await membersApi.get(id);
      setCurrentMember(member);
    } catch (error) {
      // 세션이 만료/무효화된 경우 — 로그인 안 된 상태로 취급하고 기억해둔 id를 지움.
      if (error instanceof ApiError) {
        localStorage.removeItem(MEMBER_ID_STORAGE_KEY);
        setCurrentMember(null);
      } else {
        throw error;
      }
    }
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem(MEMBER_ID_STORAGE_KEY);
    if (!storedId) {
      setIsLoading(false);
      return;
    }
    loadMember(Number(storedId)).finally(() => setIsLoading(false));
  }, [loadMember]);

  const login = useCallback(
    async (loginId: string, password: string) => {
      const { member } = await sessionApi.login(loginId, password);
      localStorage.setItem(MEMBER_ID_STORAGE_KEY, String(member.id));
      await loadMember(member.id);
    },
    [loadMember],
  );

  const logout = useCallback(async () => {
    await sessionApi.logout();
    // 대화 기록(ringle-conversation-*), voice 설정 등도 전부 "ringle-"
    // 접두사를 쓰므로 한꺼번에 지움 — 로그아웃 후 같은 브라우저에서 다른
    // 계정으로 로그인했을 때 이전 계정의 대화 내용이 남아있으면 안 됨.
    Object.keys(localStorage)
      .filter((key) => key.startsWith("ringle-"))
      .forEach((key) => localStorage.removeItem(key));
    setCurrentMember(null);
  }, []);

  const refresh = useCallback(async () => {
    if (currentMember) {
      await loadMember(currentMember.id);
    }
  }, [currentMember, loadMember]);

  return (
    <AuthContext.Provider
      value={{
        currentMember,
        isLoading,
        login,
        logout,
        refresh,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
