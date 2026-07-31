Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      get "health" => "health#show"

      resource :session, only: [ :create, :destroy ]
      get "members/:id" => "members#show"

      resources :memberships, only: [ :index, :show ]
      resources :payments, only: [ :create ]
      resources :realtime_sessions, only: [ :create ]
      resources :translations, only: [ :create ]
      resources :topics, only: [ :index, :show ]

      namespace :admin do
        get    "members" => "members#index"
        post   "members/:member_id/membership" => "member_memberships#grant"
        delete "members/:member_id/membership" => "member_memberships#revoke"
      end
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
