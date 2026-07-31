module Api
  module V1
    class MembersController < ApplicationController
      before_action -> { require_admin_or_self!(params[:id]) }, only: [ :show ]

      def show
        render json: Members::Find.new(id: params[:id]).call
      end
    end
  end
end
