import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { adminApi } from "../api/admin";
import { membershipsApi } from "../api/memberships";
import { ApiError } from "../api/client";
import type { MemberDetail, Membership } from "../types/api";

export default function AdminMembersPage() {
  const { currentMember } = useAuth();
  const isAdmin = currentMember?.role === "admin";

  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<Record<number, number>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingMemberId, setProcessingMemberId] = useState<number | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([adminApi.listMembers(), membershipsApi.list()])
      .then(([memberList, membershipList]) => {
        setMembers(memberList);
        setMemberships(membershipList);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-500">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-center text-gray-500">불러오는 중...</p>;
  }

  if (loadError) {
    return <p className="text-center text-red-600">{loadError}</p>;
  }

  const handleGrant = async (memberId: number) => {
    const membershipId = selectedMembershipId[memberId] ?? memberships[0]?.id;
    if (!membershipId) return;

    setActionError(null);
    setProcessingMemberId(memberId);
    try {
      await adminApi.grantMembership(memberId, membershipId);
      loadData();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "멤버십 부여에 실패했습니다.");
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleRevoke = async (memberId: number) => {
    setActionError(null);
    setProcessingMemberId(memberId);
    try {
      await adminApi.revokeMembership(memberId);
      loadData();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "멤버십 회수에 실패했습니다.");
    } finally {
      setProcessingMemberId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">멤버십 관리</h1>
      {actionError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">아이디</th>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">역할</th>
              <th className="px-4 py-3 font-medium">보유 멤버십</th>
              <th className="px-4 py-3 font-medium">멤버십 할당</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isProcessing = processingMemberId === member.id;
              return (
                <tr key={member.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{member.login_id}</td>
                  <td className="px-4 py-3 text-gray-900">{member.username}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {member.role === "admin" ? "관리자" : "회원"}
                  </td>
                  <td className="px-4 py-3">
                    {member.membership ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {member.membership.membership.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.membership.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {member.membership.active ? "이용 중" : "만료됨"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(member.membership.created_at).toLocaleDateString("ko-KR")} ~{" "}
                          {new Date(member.membership.expires_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">없음</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`${member.login_id} 할당할 멤버십`}
                        value={selectedMembershipId[member.id] ?? memberships[0]?.id ?? ""}
                        onChange={(e) =>
                          setSelectedMembershipId((prev) => ({
                            ...prev,
                            [member.id]: Number(e.target.value),
                          }))
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        {memberships.map((membership) => (
                          <option key={membership.id} value={membership.id}>
                            {membership.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleGrant(member.id)}
                        disabled={isProcessing}
                        className="rounded-md bg-violet-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        부여
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRevoke(member.id)}
                        disabled={!member.membership || isProcessing}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        회수
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
