# 실제 PG(결제대행사) 연동은 과제 요구사항상 제외 대상 — 항상 성공을 응답한다.
# 인스턴스 메서드로 만들어서 Payments::Create 생성자에 주입 가능하게 함(테스트
# 시 다른 Result를 반환하는 다른 gateway로 교체 가능).
class MockPaymentGatewayClient
  Result = Struct.new(:success?, keyword_init: true)

  def charge(amount:)
    Result.new(success?: true)
  end
end
