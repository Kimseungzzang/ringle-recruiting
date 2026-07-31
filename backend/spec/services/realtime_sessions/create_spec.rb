require "rails_helper"

RSpec.describe RealtimeSessions::Create do
  describe "#call" do
    it "게이트웨이 응답을 세션 DTO로 변환한다" do
      gateway = instance_double(
        OpenaiRealtimeGatewayClient,
        create_session: { "value" => "ek_test_secret", "expires_at" => 1_700_000_000 }
      )

      dto = described_class.new(gateway: gateway).call

      expect(dto).to be_a(RealtimeSessionDto)
      expect(dto.client_secret).to eq("ek_test_secret")
      expect(dto.expires_at).to eq(Time.at(1_700_000_000))
    end

    it "게이트웨이가 ProviderError를 발생시키면 그대로 전파한다" do
      gateway = instance_double(OpenaiRealtimeGatewayClient)
      allow(gateway).to receive(:create_session)
        .and_raise(OpenaiRealtimeGatewayClient::ProviderError, "openai_api_key is not configured")

      expect { described_class.new(gateway: gateway).call }
        .to raise_error(OpenaiRealtimeGatewayClient::ProviderError)
    end

    it "voice를 지정하면 그대로 게이트웨이에 넘긴다" do
      gateway = instance_double(
        OpenaiRealtimeGatewayClient,
        create_session: { "value" => "ek_test_secret", "expires_at" => 1_700_000_000 }
      )

      described_class.new(voice: "marin", gateway: gateway).call

      expect(gateway).to have_received(:create_session).with(voice: "marin")
    end

    it "voice를 지정하지 않으면 nil을 그대로 게이트웨이에 넘긴다(게이트웨이 기본값 사용)" do
      gateway = instance_double(
        OpenaiRealtimeGatewayClient,
        create_session: { "value" => "ek_test_secret", "expires_at" => 1_700_000_000 }
      )

      described_class.new(gateway: gateway).call

      expect(gateway).to have_received(:create_session).with(voice: nil)
    end

    it "허용되지 않은 voice면 InvalidVoiceError를 발생시키고 게이트웨이를 호출하지 않는다" do
      gateway = instance_double(OpenaiRealtimeGatewayClient)
      allow(gateway).to receive(:create_session)

      expect { described_class.new(voice: "nova", gateway: gateway).call }
        .to raise_error(RealtimeSessions::Create::InvalidVoiceError)
      expect(gateway).not_to have_received(:create_session)
    end
  end
end
