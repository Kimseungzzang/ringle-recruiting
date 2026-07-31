require "rails_helper"

RSpec.describe "Api::V1::Admin::MemberMemberships", type: :request do
  describe "POST /api/v1/admin/members/:member_id/membership" do
    it "관리자는 회원에게 멤버십을 부여할 수 있다" do
      admin = create(:member, :admin, login_id: "admin12345", password: "password123")
      member = create(:member)
      membership = create(:membership)
      login_as(admin)

      post "/api/v1/admin/members/#{member.id}/membership", params: { membership_id: membership.id }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["membership"]["id"]).to eq(membership.id)
      expect(member.reload.member_membership).to be_present
    end

    it "관리자가 아니면 403을 반환하고 부여되지 않는다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      target = create(:member)
      membership = create(:membership)
      login_as(member)

      post "/api/v1/admin/members/#{target.id}/membership", params: { membership_id: membership.id }

      expect(response).to have_http_status(:forbidden)
      expect(target.reload.member_membership).to be_nil
    end

    it "로그인하지 않으면 403을 반환한다" do
      target = create(:member)
      membership = create(:membership)

      post "/api/v1/admin/members/#{target.id}/membership", params: { membership_id: membership.id }

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/admin/members/:member_id/membership" do
    it "관리자는 회원의 멤버십을 회수할 수 있다" do
      admin = create(:member, :admin, login_id: "admin12345", password: "password123")
      member = create(:member)
      create(:member_membership, member: member)
      login_as(admin)

      delete "/api/v1/admin/members/#{member.id}/membership"

      expect(response).to have_http_status(:no_content)
      expect(member.reload.member_membership).to be_nil
    end

    it "보유 중인 멤버십이 없으면 422와 NO_ACTIVE_MEMBERSHIP을 반환한다" do
      admin = create(:member, :admin, login_id: "admin12345", password: "password123")
      member = create(:member)
      login_as(admin)

      delete "/api/v1/admin/members/#{member.id}/membership"

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["code"]).to eq("NO_ACTIVE_MEMBERSHIP")
    end

    it "관리자가 아니면 403을 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      target = create(:member)
      create(:member_membership, member: target)
      login_as(member)

      delete "/api/v1/admin/members/#{target.id}/membership"

      expect(response).to have_http_status(:forbidden)
      expect(target.reload.member_membership).to be_present
    end
  end
end
