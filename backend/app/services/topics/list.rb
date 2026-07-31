module Topics
  class List
    def call
      Topic.active.map { |topic| TopicDto.from(topic) }
    end
  end
end
