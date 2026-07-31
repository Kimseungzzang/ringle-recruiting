require "rails_helper"

RSpec.describe "Api::V1::Memberships", type: :request do
  describe "GET /api/v1/memberships" do
    it "로그인 없이도 멤버십 목록을 조회할 수 있다" do
      create(:membership)
      create(:membership)

      get "/api/v1/memberships"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.size).to eq(2)
    end
  end

  describe "GET /api/v1/memberships/:id" do
    it "멤버십 단건을 조회할 수 있다" do
      membership = create(:membership)

      get "/api/v1/memberships/#{membership.id}"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(membership.id)
    end

    it "존재하지 않으면 404와 MEMBERSHIP_NOT_FOUND를 반환한다" do
      get "/api/v1/memberships/-1"

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["code"]).to eq("MEMBERSHIP_NOT_FOUND")
    end
  end
end
