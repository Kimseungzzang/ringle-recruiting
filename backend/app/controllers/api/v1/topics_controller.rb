module Api
  module V1
    class TopicsController < ApplicationController
      def index
        render json: Topics::List.new.call
      end

      def show
        render json: Topics::Find.new(id: params[:id]).call
      end
    end
  end
end
