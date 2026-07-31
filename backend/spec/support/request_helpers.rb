module RequestHelpers
  # 세션 로그인 요청을 대신 보내 이후 요청에 세션 쿠키가 실리게 한다.
  def login_as(member, password: "password123")
    post "/api/v1/session", params: { login_id: member.login_id, password: password }
  end
end

RSpec.configure do |config|
  config.include RequestHelpers, type: :request
end
