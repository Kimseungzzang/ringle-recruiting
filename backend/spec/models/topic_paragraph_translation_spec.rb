require "rails_helper"

RSpec.describe TopicParagraphTranslation, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:topic_paragraph) }
    it { is_expected.to belong_to(:locale) }
  end

  describe "validations" do
    subject { create(:topic_paragraph_translation) }

    it { is_expected.to validate_presence_of(:content) }
  end

  describe "uniqueness" do
    it "does not allow the same locale twice on one paragraph" do
      topic_paragraph = create(:topic_paragraph)
      locale = create(:locale)
      create(:topic_paragraph_translation, topic_paragraph: topic_paragraph, locale: locale)

      duplicate = build(:topic_paragraph_translation, topic_paragraph: topic_paragraph, locale: locale)

      expect(duplicate).not_to be_valid
    end
  end
end
