RealtimeSessionDto = Data.define(:client_secret, :expires_at) do
  def self.from(response)
    new(
      client_secret: response["value"],
      expires_at: Time.at(response["expires_at"])
    )
  end
end
