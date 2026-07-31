TopicParagraphDto = Data.define(:id, :position, :translations) do
  def self.from(topic_paragraph)
    new(
      id: topic_paragraph.id,
      position: topic_paragraph.position,
      # { "ko" => "...", "eng" => "..." } 형태 — 이 문단에 번역 row가 없는
      # 언어는 hash에서 그냥 빠짐(nil로 채워지지 않음).
      translations: topic_paragraph.topic_paragraph_translations.each_with_object({}) do |translation, result|
        result[translation.locale.name] = translation.content
      end
    )
  end
end
