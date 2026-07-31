TopicDto = Data.define(:id, :title, :title_en) do
  def self.from(topic)
    new(id: topic.id, title: topic.title, title_en: topic.title_en)
  end
end
