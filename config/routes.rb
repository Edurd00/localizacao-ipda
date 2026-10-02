# frozen_string_literal: true

Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :igrejas, only: [] do
        collection do
          get  :validadas
          post :salvar_localizacao
          post :expandir_link
        end
      end

      resources :patrimonios, only: [] do
        collection do
          get  :dashboard
          post :submeter_publico
        end
      end
    end
  end
end
