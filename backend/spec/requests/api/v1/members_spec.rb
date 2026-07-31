require "rails_helper"

RSpec.describe "Api::V1::Members", type: :request do
  describe "GET /api/v1/members/:id" do
    it "본인 정보를 조회할 수 있다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      login_as(member)

      get "/api/v1/members/#{member.id}"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(member.id)
    end

    it "관리자는 다른 회원 정보를 조회할 수 있다" do
      admin = create(:member, :admin, login_id: "admin12345", password: "password123")
      other = create(:member)
      login_as(admin)

      get "/api/v1/members/#{other.id}"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(other.id)
    end

    it "본인도 관리자도 아니면 403을 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      other = create(:member)
      login_as(member)

      get "/api/v1/members/#{other.id}"

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["code"]).to eq("FORBIDDEN")
    end

    it "로그인하지 않은 상태면 401이 아닌 403을 반환한다" do
      member = create(:member)

      get "/api/v1/members/#{member.id}"

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["code"]).to eq("FORBIDDEN")
    end

    it "존재하지 않는 회원이면 404와 MEMBER_NOT_FOUND를 반환한다" do
      admin = create(:member, :admin, login_id: "admin12345", password: "password123")
      login_as(admin)

      get "/api/v1/members/-1"

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["code"]).to eq("MEMBER_NOT_FOUND")
    end
  end
end
