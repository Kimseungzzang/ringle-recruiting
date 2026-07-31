module Api
  module V1
    module Admin
      class MembersController < BaseController
        def index
          render json: Members::List.new.call
        end
      end
    end
  end
end
