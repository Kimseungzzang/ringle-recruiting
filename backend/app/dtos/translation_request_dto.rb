TranslationRequestDto = Data.define(:text) do
  def self.from(params)
    new(text: params[:text])
  end
end
