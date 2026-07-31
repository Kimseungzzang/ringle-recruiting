require "rails_helper"

RSpec.describe Translations::Create do
  describe "#call" do
    it "게이트웨이 응답에서 번역 텍스트를 뽑아 DTO로 반환한다" do
      gateway = instance_double(OpenaiTranslationGatewayClient)
      allow(gateway).to receive(:translate)
        .with(text: "Nice to meet you.")
        .and_return({ "choices" => [ { "message" => { "content" => "만나서 반가워요." } } ] })

      dto = described_class.new(text: "Nice to meet you.", gateway: gateway).call

      expect(dto).to be_a(TranslationDto)
      expect(dto.translation).to eq("만나서 반가워요.")
    end

    it "게이트웨이가 ProviderError를 발생시키면 그대로 전파한다" do
      gateway = instance_double(OpenaiTranslationGatewayClient)
      allow(gateway).to receive(:translate)
        .and_raise(OpenaiTranslationGatewayClient::ProviderError, "openai_api_key is not configured")

      expect { described_class.new(text: "Hello", gateway: gateway).call }
        .to raise_error(OpenaiTranslationGatewayClient::ProviderError)
    end

    it "텍스트가 비어있으면 BlankTextError를 발생시키고 게이트웨이를 호출하지 않는다" do
      gateway = instance_double(OpenaiTranslationGatewayClient)
      allow(gateway).to receive(:translate)

      expect { described_class.new(text: "", gateway: gateway).call }
        .to raise_error(Translations::Create::BlankTextError)
      expect(gateway).not_to have_received(:translate)
    end

    it "텍스트가 공백뿐이어도 BlankTextError를 발생시킨다" do
      gateway = instance_double(OpenaiTranslationGatewayClient)

      expect { described_class.new(text: "   ", gateway: gateway).call }
        .to raise_error(Translations::Create::BlankTextError)
    end

    it "텍스트가 최대 길이를 넘으면 TextTooLongError를 발생시키고 게이트웨이를 호출하지 않는다" do
      gateway = instance_double(OpenaiTranslationGatewayClient)
      allow(gateway).to receive(:translate)
      too_long_text = "a" * (Translations::Create::MAX_TEXT_LENGTH + 1)

      expect { described_class.new(text: too_long_text, gateway: gateway).call }
        .to raise_error(Translations::Create::TextTooLongError)
      expect(gateway).not_to have_received(:translate)
    end

    it "최대 길이와 같으면 통과한다" do
      gateway = instance_double(
        OpenaiTranslationGatewayClient,
        translate: { "choices" => [ { "message" => { "content" => "번역됨" } } ] }
      )
      max_length_text = "a" * Translations::Create::MAX_TEXT_LENGTH

      expect { described_class.new(text: max_length_text, gateway: gateway).call }.not_to raise_error
    end
  end
end
