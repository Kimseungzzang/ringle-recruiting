TranslationDto = Data.define(:translation) do
  def self.from(response)
    new(translation: response.dig("choices", 0, "message", "content").to_s.strip)
  end
end
