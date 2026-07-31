require "rails_helper"

RSpec.describe Topics::List do
  describe "#call" do
    it "삭제되지 않은 주제 목록을 DTO로 반환한다" do
      active_topic = create(:topic, title: "일상 대화", title_en: "Casual Conversation")
      create(:topic, deleted_at: Time.current)

      result = described_class.new.call

      expect(result).to all(be_a(TopicDto))
      expect(result.map(&:id)).to contain_exactly(active_topic.id)
      expect(result.first.title_en).to eq("Casual Conversation")
    end
  end
end
