RealtimeSessionRequestDto = Data.define(:voice) do
  def self.from(params)
    new(voice: params[:voice])
  end
end
