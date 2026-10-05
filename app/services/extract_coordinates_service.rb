require 'net/http'
require 'uri'

class ExtractCoordinatesService
  def initialize(text)
    @text = text.to_s.strip
  end

  def call
    return { success: false, error: 'Texto ou link não informado' } if @text.nil? || @text.empty?

    # 1. Expand shortened URLs if present
    expanded_text = expand_urls(@text)

    # 2. Extract coordinates via Regex
    coords = parse_coordinates(expanded_text)
    return coords if coords[:success]

    # Fallback: try parsing unexpanded text
    parse_coordinates(@text)
  end

  private

  def expand_urls(input_text)
    # Match URLs in text
    urls = URI.extract(input_text, ['http', 'https'])
    return input_text if urls.empty?

    result_text = input_text.dup

    urls.each do |url|
      next unless url.match?(/goo\.gl|maps\.app\.goo\.gl|t\.co|bit\.ly/)

      expanded_url = follow_redirects(url)
      result_text.gsub!(url, expanded_url) if expanded_url && !expanded_url.empty?
    end

    result_text
  end

  def follow_redirects(url, limit = 5)
    return url if limit <= 0

    uri = URI.parse(url) rescue nil
    return url unless uri && (uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS))

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    http.open_timeout = 5
    http.read_timeout = 5

    response = http.request_head(uri.request_uri) rescue nil
    return url unless response

    if response.is_a?(Net::HTTPRedirection) && response['location'] && !response['location'].empty?
      new_location = response['location']
      new_uri = URI.parse(new_location) rescue nil
      new_location = uri.merge(new_uri).to_s if new_uri && new_uri.relative?

      follow_redirects(new_location, limit - 1)
    else
      url
    end
  rescue StandardError => e
    Rails.logger.error("Error expanding URL #{url}: #{e.message}") if defined?(Rails)
    url
  end

  def parse_coordinates(text)
    # Pattern 1: @-23.5505,-46.6333
    if (match = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))
      return build_result(match[1], match[2])
    end

    # Pattern 2: q=-23.5505,-46.6333 or query=-23.5505,-46.6333
    if (match = text.match(/[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/))
      return build_result(match[1], match[2])
    end

    # Pattern 3: ll=-23.5505,-46.6333
    if (match = text.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/))
      return build_result(match[1], match[2])
    end

    # Pattern 4: Raw decimal coordinates (-23.55052, -46.633308)
    if (match = text.match(/(-?\d{1,2}\.\d{3,15})\s*,\s*(-?\d{1,3}\.\d{3,15})/))
      return build_result(match[1], match[2])
    end

    { success: false, error: 'Coordenadas não encontradas no link ou mensagem informada' }
  end

  def build_result(lat, lng)
    latitude = lat.to_f
    longitude = lng.to_f

    if latitude != 0.0 && longitude != 0.0 && latitude.between?(-90.0, 90.0) && longitude.between?(-180.0, 180.0)
      {
        success: true,
        latitude: latitude,
        longitude: longitude,
        lat: latitude,
        lng: longitude
      }
    else
      { success: false, error: 'Coordenadas inválidas extraídas' }
    end
  end
end
