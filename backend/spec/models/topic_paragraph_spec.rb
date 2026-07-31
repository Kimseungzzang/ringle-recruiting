require "rails_helper"

RSpec.describe TopicParagraph, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:topic) }
    it { is_expected.to have_many(:topic_paragraph_translations).dependent(:destroy) }
    it { is_expected.to have_many(:locales).through(:topic_paragraph_translations) }
  end

  describe "validations" do
    subject { create(:topic_paragraph, position: 0) }

    it { is_expected.to validate_presence_of(:position) }
    it { is_expected.to validate_uniqueness_of(:position).scoped_to(:topic_id) }
    it { is_expected.to validate_numericality_of(:position).only_integer.is_greater_than_or_equal_to(0) }
  end
end
