Rails.application.routes.draw do
  root "map#index"

  get "map/locations", to: "map#locations"

  get "validation", to: "validation#show"
  patch "validation/:id", to: "validation#update", as: :update_validation
end
