class ValidationController < ApplicationController
  before_action :set_church, only: [:update]

  def show
    @church = find_next_pending_church
  end

  def update
    if @church
      latitude = params[:latitude] || params.dig(:church, :latitude)
      longitude = params[:longitude] || params.dig(:church, :longitude)

      if latitude.present? && longitude.present?
        if @church.respond_to?(:latitude=) && @church.respond_to?(:longitude=)
          @church.latitude = latitude.to_f
          @church.longitude = longitude.to_f
        end

        if @church.respond_to?(:status=)
          @church.status = 'VALIDADO'
        elsif @church.respond_to?(:validada=)
          @church.validada = true
        end

        @church.save rescue nil
      end
    end

    @next_church = find_next_pending_church

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to validation_path }
    end
  end

  private

  def set_church
    @church = Church.find(params[:id]) rescue nil
  end

  def find_next_pending_church
    if Church.column_names.include?('status')
      Church.where("LOWER(status) NOT LIKE 'validad%' AND UPPER(status) NOT IN ('VALIDADO', 'VALIDADA')").first
    elsif Church.column_names.include?('validada')
      Church.where(validada: [false, nil]).first
    else
      Church.first
    end
  rescue StandardError
    nil
  end
end
