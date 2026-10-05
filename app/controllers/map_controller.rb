class MapController < ApplicationController
  def index
    @total_churches_count = Church.count rescue 0
  end

  def locations
    churches = Church.all

    # Filter valid non-zero latitude/longitude coordinates if columns are present
    if Church.column_names.include?('latitude') && Church.column_names.include?('longitude')
      churches = churches.where.not(latitude: [nil, 0], longitude: [nil, 0])
    end

    render json: churches.map(&:as_map_json)
  rescue StandardError => e
    render json: { error: e.message }, status: :internal_server_error
  end
end
