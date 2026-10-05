Rails.application.routes.draw do
  root "map#index"

  get "map/locations", to: "map#locations"
end
