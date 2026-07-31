require "rails_helper"

RSpec.describe Auth::Login do
  describe "#call" do
    it "로그인 정보가 일치하면 회원 DTO를 반환한다" do
      member = create(:member, login_id: "tester1234", password: "password123")
      request = LoginRequestDto.new(login_id: "tester1234", password: "password123")

      dto = described_class.new(request: request).call

      expect(dto).to be_a(MemberDto)
      expect(dto.id).to eq(member.id)
    end

    it "비밀번호가 틀리면 InvalidCredentialsError를 발생시킨다" do
      create(:member, login_id: "tester1234", password: "password123")
      request = LoginRequestDto.new(login_id: "tester1234", password: "wrong-password")

      expect { described_class.new(request: request).call }
        .to raise_error(Auth::Login::InvalidCredentialsError)
    end

    it "존재하지 않는 로그인 아이디면 InvalidCredentialsError를 발생시킨다" do
      request = LoginRequestDto.new(login_id: "no-such-member", password: "password123")

      expect { described_class.new(request: request).call }
        .to raise_error(Auth::Login::InvalidCredentialsError)
    end

    it "삭제된 회원은 로그인할 수 없다" do
      create(:member, login_id: "tester1234", password: "password123", deleted_at: Time.current)
      request = LoginRequestDto.new(login_id: "tester1234", password: "password123")

      expect { described_class.new(request: request).call }
        .to raise_error(Auth::Login::InvalidCredentialsError)
    end
  end
end
