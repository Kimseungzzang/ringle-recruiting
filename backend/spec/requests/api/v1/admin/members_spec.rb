require "rails_helper"

RSpec.describe "Api::V1::Admin::Members", type: :request do
  describe "GET /api/v1/admin/members" do
    it "관리자는 회원 목록을 멤버십 정보와 함께 조회할 수 있다" do
      admin = create(:member, :admin, login_id: "admin12345", password: "password123")
      member = create(:member)
      membership = create(:membership)
      create(:member_membership, member: member, membership: membership)
      login_as(admin)

      get "/api/v1/admin/members"

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      target = body.find { |row| row["id"] == member.id }
      expect(target["membership"]["membership"]["id"]).to eq(membership.id)
    end

    it "관리자가 아니면 403을 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      login_as(member)

      get "/api/v1/admin/members"

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["code"]).to eq("FORBIDDEN")
    end

    it "로그인하지 않으면 403을 반환한다" do
      get "/api/v1/admin/members"

      expect(response).to have_http_status(:forbidden)
    end
  end
end
