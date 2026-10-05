require_relative "boot"

# Minimal Rails require fallback if rails/all gem bundle is not active
begin
  require "rails/all"
rescue LoadError
  require "rails"
  require "active_model/railtie"
  require "active_record/railtie"
  require "action_controller/railtie"
  require "action_view/railtie"
end

module GeovaligIpda
  class Application < Rails::Application
    config.load_defaults 8.0 rescue nil

    config.time_zone = "America/Sao_Paulo"
    config.i18n.default_locale = :"pt-BR" rescue nil
  end
end
