require "rails_helper"

RSpec.describe Locale, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:topic_paragraph_translations).dependent(:restrict_with_error) }
    it { is_expected.to have_many(:topic_paragraphs).through(:topic_paragraph_translations) }
    it { is_expected.to have_many(:topics).through(:topic_paragraphs) }
  end

  describe "validations" do
    subject { create(:locale) }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:name) }
  end
end
