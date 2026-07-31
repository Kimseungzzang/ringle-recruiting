require "rails_helper"

RSpec.describe "Api::V1::RealtimeSessions", type: :request do
  describe "POST /api/v1/realtime_sessions" do
    it "로그인하지 않으면 401과 UNAUTHORIZED를 반환한다" do
      post "/api/v1/realtime_sessions"

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["code"]).to eq("UNAUTHORIZED")
    end

    it "converse 권한이 있는 활성 멤버십이 없으면 403과 MEMBERSHIP_PERMISSION_REQUIRED를 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      login_as(member)

      post "/api/v1/realtime_sessions"

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["code"]).to eq("MEMBERSHIP_PERMISSION_REQUIRED")
    end

    it "converse 권한이 없는 멤버십(예: study만 있는 베이직)을 보유한 경우에도 403을 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      membership = create(:membership)
      membership.permissions << create(:permission, :study)
      create(:member_membership, member: member, membership: membership)
      login_as(member)

      post "/api/v1/realtime_sessions"

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["code"]).to eq("MEMBERSHIP_PERMISSION_REQUIRED")
    end

    it "만료된 멤버십은 converse 권한이 있어도 403을 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      membership = create(:membership)
      membership.permissions << create(:permission, :converse)
      create(:member_membership, member: member, membership: membership, expires_at: 1.day.ago)
      login_as(member)

      post "/api/v1/realtime_sessions"

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

      post "/api/v1/realtime_sessions"

      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body["code"]).to eq("PROVIDER_ERROR")
    end

    it "허용되지 않은 voice를 보내면 422와 INVALID_VOICE를 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      membership = create(:membership)
      membership.permissions << create(:permission, :converse)
      create(:member_membership, member: member, membership: membership)
      login_as(member)

      post "/api/v1/realtime_sessions", params: { voice: "nova" }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["code"]).to eq("INVALID_VOICE")
    end
  end
end
