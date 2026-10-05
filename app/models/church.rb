class Church < ApplicationRecord
  self.table_name = 'igrejas'

  # Safe getter for name supporting both 'nome' and 'desc_igreja' columns
  def nome
    if has_attribute?(:nome) && self[:nome].present?
      self[:nome]
    elsif has_attribute?(:desc_igreja)
      self[:desc_igreja]
    elsif respond_to?(:desc_igreja)
      desc_igreja
    else
      nil
    end
  end

  # Getter for validada boolean field based on status column or validada attribute
  def validada
    if has_attribute?(:validada)
      self[:validada]
    elsif respond_to?(:status) && status.to_s.strip.length > 0
      status.to_s.strip.upcase.start_with?('VALIDAD')
    else
      false
    end
  end

  # Setter for validada boolean field
  def validada=(value)
    boolean_value = ActiveModel::Type::Boolean.new.cast(value)
    if has_attribute?(:validada)
      self[:validada] = boolean_value
    elsif respond_to?(:status=)
      self.status = boolean_value ? 'VALIDADO' : 'PENDENTE'
    end
  end

  # Formats church data for map consumption
  def as_map_json
    {
      id: respond_to?(:id) ? id : nil,
      codigo_totvs: respond_to?(:codigo_totvs) ? codigo_totvs : nil,
      nome: nome,
      porte: respond_to?(:porte) ? porte : nil,
      endereco: respond_to?(:endereco) ? endereco : nil,
      bairro: respond_to?(:bairro) ? bairro : nil,
      municipio: respond_to?(:municipio) ? municipio : nil,
      estado: respond_to?(:estado) ? estado : nil,
      cep: respond_to?(:cep) ? cep : nil,
      latitude: respond_to?(:latitude) ? latitude : nil,
      longitude: respond_to?(:longitude) ? longitude : nil,
      validada: validada,
      link_google_maps: respond_to?(:link_google_maps) ? link_google_maps : nil
    }
  end
end
