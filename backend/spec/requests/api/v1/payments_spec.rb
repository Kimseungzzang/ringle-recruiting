require "rails_helper"

RSpec.describe "Api::V1::Payments", type: :request do
  describe "POST /api/v1/payments" do
    it "로그인한 회원이 결제하면 멤버십이 부여된다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      membership = create(:membership)
      login_as(member)

      post "/api/v1/payments", params: { membership_id: membership.id }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["membership"]["id"]).to eq(membership.id)
      expect(member.reload.member_membership).to be_present
    end

    it "로그인하지 않으면 401과 UNAUTHORIZED를 반환한다" do
      membership = create(:membership)

      post "/api/v1/payments", params: { membership_id: membership.id }

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["code"]).to eq("UNAUTHORIZED")
    end

    it "존재하지 않는 멤버십이면 404와 MEMBERSHIP_NOT_FOUND를 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      login_as(member)

      post "/api/v1/payments", params: { membership_id: -1 }

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["code"]).to eq("MEMBERSHIP_NOT_FOUND")
    end
  end
end
