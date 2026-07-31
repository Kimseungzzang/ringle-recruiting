LoginRequestDto = Data.define(:login_id, :password) do
  def self.from(params)
    new(
      login_id: params[:login_id],
      password: params[:password]
    )
  end
end
