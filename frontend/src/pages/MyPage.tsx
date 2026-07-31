import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const permissionLabels: Record<string, string> = {
  study: "학습",
  converse: "대화",
  analyze: "분석",
};

export default function MyPage() {
  const { currentMember, isLoading, openLoginModal } = useAuth();

  if (isLoading) {
    return <p className="text-center text-gray-500">불러오는 중...</p>;
  }

  if (!currentMember) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-500">로그인이 필요합니다.</p>
        <button
          type="button"
          onClick={openLoginModal}
          className="text-sm font-medium text-violet-600 hover:underline"
        >
          로그인하러 가기 →
        </button>
      </div>
    );
  }

  const member = currentMember;
  const memberMembership = member.membership;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500">회원 정보</h2>
        <dl className="mt-3 grid grid-cols-[80px_1fr] gap-y-2 text-sm">
          <dt className="text-gray-500">아이디</dt>
          <dd className="text-gray-900">{member.login_id}</dd>
          <dt className="text-gray-500">이름</dt>
          <dd className="text-gray-900">{member.username}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">보유 멤버십</h2>
          {!memberMembership?.active && (
            <Link
              to="/membership/purchase"
              className="text-sm font-medium text-violet-600 hover:underline"
            >
              구매하러 가기 →
            </Link>
          )}
        </div>

        {memberMembership ? (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {memberMembership.membership.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  memberMembership.active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {memberMembership.active ? "이용 중" : "만료됨"}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(memberMembership.expires_at).toLocaleDateString("ko-KR")}까지
            </p>
            <div className="mt-3 flex gap-2">
              {memberMembership.membership.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700"
                >
                  {permissionLabels[permission] ?? permission}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">보유 중인 멤버십이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
