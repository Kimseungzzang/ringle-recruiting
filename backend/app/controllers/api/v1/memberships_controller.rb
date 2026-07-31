module Api
  module V1
    class MembershipsController < ApplicationController
      def index
        render json: Memberships::List.new.call
      end

      def show
        render json: Memberships::Find.new(id: params[:id]).call
      end
    end
  end
end
