TopicDetailDto = Data.define(:id, :title, :title_en, :paragraphs) do
  def self.from(topic)
    new(
      id: topic.id,
      title: topic.title,
      title_en: topic.title_en,
      # position 순으로 정렬된 문단 목록(topic.topic_paragraphs 기본 정렬) —
      # 문단마다 언어별 content를 담아 순서대로 반환.
      paragraphs: topic.topic_paragraphs.map { |topic_paragraph| TopicParagraphDto.from(topic_paragraph) }
    )
  end
end
