require "rails_helper"

RSpec.describe "Api::V1::Topics", type: :request do
  describe "GET /api/v1/topics" do
    it "로그인 없이도 주제 목록을 조회할 수 있다" do
      create(:topic, title: "일상 대화", title_en: "Casual Conversation")
      create(:topic, deleted_at: Time.current)

      get "/api/v1/topics"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.size).to eq(1)
      expect(response.parsed_body.first["title_en"]).to eq("Casual Conversation")
    end
  end

  describe "GET /api/v1/topics/:id" do
    it "주제 상세와 문단별 언어 번역을 순서대로 조회할 수 있다" do
      topic = create(:topic, title: "일상 대화", title_en: "Casual Conversation")
      ko = create(:locale, :ko)
      paragraph = create(:topic_paragraph, topic: topic, position: 0)
      create(:topic_paragraph_translation, topic_paragraph: paragraph, locale: ko, content: "안녕하세요")

      get "/api/v1/topics/#{topic.id}"

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["title"]).to eq("일상 대화")
      expect(body["title_en"]).to eq("Casual Conversation")
      expect(body["paragraphs"].size).to eq(1)
      expect(body["paragraphs"].first["translations"]).to eq({ "ko" => "안녕하세요" })
    end

    it "존재하지 않으면 404와 TOPIC_NOT_FOUND를 반환한다" do
      get "/api/v1/topics/-1"

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["code"]).to eq("TOPIC_NOT_FOUND")
    end
  end
end
