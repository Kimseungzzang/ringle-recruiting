PaymentRequestDto = Data.define(:membership_id) do
  def self.from(params)
    new(membership_id: params[:membership_id])
  end
end
