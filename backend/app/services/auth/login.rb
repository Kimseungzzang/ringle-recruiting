module Auth
  class Login
    class InvalidCredentialsError < StandardError
      CODE = "INVALID_CREDENTIALS"
    end

    def initialize(request:)
      @request = request
    end

    def call
      member = Member.active.find_by(login_id: @request.login_id)
      raise InvalidCredentialsError unless member&.authenticate(@request.password)

      MemberDto.from(member)
    end
  end
end
