# frozen_string_literal: true

module GoogleMaps
  class ExtractCoordinatesService
    PATTERNS = [
      /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&]destination=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&]origin=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/
    ].freeze

    def self.call(url)
      new(url).call
    end

    def initialize(url)
      @url = url.to_s.strip
    end

    def call
      return nil if @url.nil? || @url.empty?

      PATTERNS.each do |pattern|
        match = @url.match(pattern)
        if match
          lat = match[1].to_f
          lng = match[2].to_f
          return { latitude: lat, longitude: lng } if valid_coordinates?(lat, lng)
        end
      end

      nil
    end

    private

    def valid_coordinates?(lat, lng)
      lat.between?(-90.0, 90.0) && lng.between?(-180.0, 180.0) && (lat != 0.0 || lng != 0.0)
    end
  end
end
