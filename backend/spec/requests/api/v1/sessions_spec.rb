require "rails_helper"

RSpec.describe "Api::V1::Sessions", type: :request do
  describe "POST /api/v1/session" do
    it "로그인에 성공하면 회원 정보를 반환하고 세션을 생성한다" do
      member = create(:member, login_id: "tester1234", password: "password123")

      post "/api/v1/session", params: { login_id: "tester1234", password: "password123" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["member"]["id"]).to eq(member.id)
    end

    it "비밀번호가 틀리면 401과 INVALID_CREDENTIALS를 반환한다" do
      create(:member, login_id: "tester1234", password: "password123")

      post "/api/v1/session", params: { login_id: "tester1234", password: "wrong-password" }

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["code"]).to eq("INVALID_CREDENTIALS")
    end

    it "존재하지 않는 아이디면 401과 INVALID_CREDENTIALS를 반환한다" do
      post "/api/v1/session", params: { login_id: "no-such-id", password: "password123" }

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["code"]).to eq("INVALID_CREDENTIALS")
    end
  end

  describe "DELETE /api/v1/session" do
    it "로그아웃하면 204를 반환하고 세션을 지운다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      login_as(member)

      delete "/api/v1/session"
      expect(response).to have_http_status(:no_content)

      get "/api/v1/members/#{member.id}"
      expect(response).to have_http_status(:forbidden)
    end
  end
end
