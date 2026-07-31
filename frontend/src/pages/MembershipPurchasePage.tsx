import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { membershipsApi } from "../api/memberships";
import { paymentsApi } from "../api/payments";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Membership } from "../types/api";

const permissionLabels: Record<string, string> = {
  study: "학습",
  converse: "대화",
  analyze: "분석",
};

export default function MembershipPurchasePage() {
  const { currentMember, refresh, openLoginModal } = useAuth();
  const navigate = useNavigate();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  // 이미 다른 플랜의 활성 멤버십을 갖고 있는 상태에서 또 다른 플랜을
  // 구매하면(백엔드 grant! 정책상) 연장이 아니라 오늘 날짜부터 새 플랜으로
  // 덮어써지고 기존 잔여 기간은 사라짐 — 구매를 막진 않되(요구사항엔 없어
  // 가정) 그 사실을 미리 안내하는 확인 팝업의 대상 플랜.
  const [pendingMembership, setPendingMembership] = useState<Membership | null>(null);

  useEffect(() => {
    membershipsApi
      .list()
      .then(setMemberships)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, []);

  const executePurchase = async (membershipId: number) => {
    setPurchaseError(null);
    setPurchasingId(membershipId);
    try {
      await paymentsApi.create(membershipId);
      await refresh();
      navigate("/mypage");
    } catch (err) {
      setPurchaseError(err instanceof ApiError ? err.message : "결제에 실패했습니다.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handlePurchase = (membership: Membership) => {
    if (!currentMember) {
      openLoginModal();
      return;
    }

    const current = currentMember.membership;
    const isSwitchingPlan = !!current?.active && current.membership.id !== membership.id;
    if (isSwitchingPlan) {
      setPendingMembership(membership);
      return;
    }

    void executePurchase(membership.id);
  };

  const confirmSwitch = () => {
    if (!pendingMembership) return;
    void executePurchase(pendingMembership.id);
    setPendingMembership(null);
  };

  if (isLoading) {
    return <p className="text-center text-gray-500">불러오는 중...</p>;
  }

  if (loadError) {
    return <p className="text-center text-red-600">{loadError}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">이용권 구매</h1>
      {purchaseError && <p className="text-sm text-red-600">{purchaseError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {memberships.map((membership) => (
          <div
            key={membership.id}
            className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-bold text-gray-900">{membership.name}</h2>
              <p className="text-sm text-gray-500">{membership.duration_days}일 이용권</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {membership.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700"
                >
                  {permissionLabels[permission] ?? permission}
                </span>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xl font-bold text-gray-900">
                {membership.price.toLocaleString("ko-KR")}원
              </span>
              <button
                type="button"
                onClick={() => handlePurchase(membership)}
                disabled={purchasingId === membership.id}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {purchasingId === membership.id ? "구매 중..." : "구매"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {pendingMembership && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow-lg">
            <div>
              <h2 className="text-lg font-bold text-gray-900">다른 멤버십으로 전환하시겠어요?</h2>
              <p className="mt-2 text-sm text-gray-500">
                현재 보유 중인 멤버십과 다른 플랜이에요. 지금 구매하면 오늘부터{" "}
                <strong className="text-gray-900">{pendingMembership.name}</strong> 멤버십으로 새로
                적용되고, 기존 멤버십의 남은 이용 기간은 사라져요.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingMembership(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmSwitch}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                계속 구매하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
