require "rails_helper"

RSpec.describe Topic, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:topic_paragraphs).dependent(:destroy) }
    it { is_expected.to have_many(:locales).through(:topic_paragraph_translations) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_presence_of(:title_en) }
  end

  describe ".active" do
    it "excludes soft-deleted topics" do
      active_topic = create(:topic)
      deleted_topic = create(:topic, deleted_at: Time.current)

      expect(Topic.active).to include(active_topic)
      expect(Topic.active).not_to include(deleted_topic)
    end
  end

  describe "#deleted?" do
    it "is true when deleted_at is present" do
      expect(build(:topic, deleted_at: Time.current).deleted?).to eq(true)
    end

    it "is false when deleted_at is nil" do
      expect(build(:topic, deleted_at: nil).deleted?).to eq(false)
    end
  end

  describe "#topic_paragraphs" do
    it "position 순으로 정렬되어 반환된다" do
      topic = create(:topic)
      second = create(:topic_paragraph, topic: topic, position: 1)
      first = create(:topic_paragraph, topic: topic, position: 0)

      expect(topic.topic_paragraphs).to eq([ first, second ])
    end
  end
end
