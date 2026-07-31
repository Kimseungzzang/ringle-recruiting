require "rails_helper"

RSpec.describe Topics::Find do
  describe "#call" do
    it "주제 정보와 문단을 position 순으로, 문단마다 언어별 hash로 반환한다" do
      topic = create(:topic, title: "일상 대화", title_en: "Casual Conversation")
      ko = create(:locale, :ko)
      eng = create(:locale, :eng)
      second_paragraph = create(:topic_paragraph, topic: topic, position: 1)
      first_paragraph = create(:topic_paragraph, topic: topic, position: 0)
      create(:topic_paragraph_translation, topic_paragraph: first_paragraph, locale: ko, content: "안녕하세요")
      create(:topic_paragraph_translation, topic_paragraph: first_paragraph, locale: eng, content: "Hello")
      create(:topic_paragraph_translation, topic_paragraph: second_paragraph, locale: ko, content: "반가워요")
      create(:topic_paragraph_translation, topic_paragraph: second_paragraph, locale: eng, content: "Nice to meet you")

      dto = described_class.new(id: topic.id).call

      expect(dto).to be_a(TopicDetailDto)
      expect(dto.title).to eq("일상 대화")
      expect(dto.title_en).to eq("Casual Conversation")
      expect(dto.paragraphs.map(&:id)).to eq([ first_paragraph.id, second_paragraph.id ])
      expect(dto.paragraphs.first.translations).to eq({ Locale::KO => "안녕하세요", Locale::ENG => "Hello" })
      expect(dto.paragraphs.second.translations).to eq({ Locale::KO => "반가워요", Locale::ENG => "Nice to meet you" })
    end

    it "번역이 없는 언어는 해당 문단의 결과 hash에서 빠진다" do
      topic = create(:topic)
      ko = create(:locale, :ko)
      paragraph = create(:topic_paragraph, topic: topic)
      create(:topic_paragraph_translation, topic_paragraph: paragraph, locale: ko, content: "안녕하세요")

      dto = described_class.new(id: topic.id).call

      expect(dto.paragraphs.first.translations.keys).to eq([ Locale::KO ])
    end

    it "삭제된 주제는 조회되지 않는다" do
      topic = create(:topic, deleted_at: Time.current)

      expect { described_class.new(id: topic.id).call }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "존재하지 않는 주제면 RecordNotFound를 발생시킨다" do
      expect { described_class.new(id: -1).call }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
