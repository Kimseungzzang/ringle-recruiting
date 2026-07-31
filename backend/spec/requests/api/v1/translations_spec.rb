require "rails_helper"

RSpec.describe "Api::V1::Translations", type: :request do
  describe "POST /api/v1/translations" do
    it "로그인하지 않으면 401과 UNAUTHORIZED를 반환한다" do
      post "/api/v1/translations", params: { text: "Hello" }

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["code"]).to eq("UNAUTHORIZED")
    end

    it "converse 권한이 있는 활성 멤버십이 없으면 403과 MEMBERSHIP_PERMISSION_REQUIRED를 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      login_as(member)

      post "/api/v1/translations", params: { text: "Hello" }

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["code"]).to eq("MEMBERSHIP_PERMISSION_REQUIRED")
    end

    it "converse 권한이 있는 활성 멤버십을 보유하면 권한 검증은 통과하고, 테스트 환경엔 " \
       "OpenAI 키가 없어 자연스럽게 502와 PROVIDER_ERROR를 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      membership = create(:membership)
      membership.permissions << create(:permission, :converse)
      create(:member_membership, member: member, membership: membership)
      login_as(member)

      post "/api/v1/translations", params: { text: "Hello" }

      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body["code"]).to eq("PROVIDER_ERROR")
    end

    it "text가 비어있으면 422와 BLANK_TEXT를 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      membership = create(:membership)
      membership.permissions << create(:permission, :converse)
      create(:member_membership, member: member, membership: membership)
      login_as(member)

      post "/api/v1/translations", params: { text: "" }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["code"]).to eq("BLANK_TEXT")
    end

    it "text가 최대 길이를 넘으면 422와 TEXT_TOO_LONG을 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      membership = create(:membership)
      membership.permissions << create(:permission, :converse)
      create(:member_membership, member: member, membership: membership)
      login_as(member)

      post "/api/v1/translations", params: { text: "a" * (Translations::Create::MAX_TEXT_LENGTH + 1) }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["code"]).to eq("TEXT_TOO_LONG")
    end
  end
end
