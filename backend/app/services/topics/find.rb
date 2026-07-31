module Topics
  class Find
    def initialize(id:)
      @id = id
    end

    def call
      # topic_paragraphs + 그 번역/locale을 미리 eager load 해둬서
      # TopicDetailDto가 문단별 언어 hash를 만들 때 N+1이 안 나게 함
      topic = Topic.active.includes(topic_paragraphs: { topic_paragraph_translations: :locale }).find(@id)
      TopicDetailDto.from(topic)
    end
  end
end
