require 'json'

# Mock minimal ActiveModel/ActiveRecord environment for standalone testing
module ActiveModel
  module Type
    class Boolean
      def cast(value)
        return false if value.nil? || value == false || value == 0 || value =~ /^(false|f|no|n|0)$/i
        true
      end
    end
  end
end

class ActiveRecordMock
  def self.table_name=(name); end
  def self.alias_attribute(new_name, old_name)
    define_method(new_name) { send(old_name) }
    define_method("#{new_name}=") { |val| send("#{old_name}=", val) }
  end

  def has_attribute?(attr)
    false
  end
end

# Load Church model class definition after mocks
class Church < ActiveRecordMock
  attr_accessor :id, :codigo_totvs, :desc_igreja, :porte, :endereco, :bairro,
                :municipio, :estado, :cep, :latitude, :longitude, :status, :link_google_maps

  alias_attribute :nome, :desc_igreja

  def validada
    if has_attribute?(:validada)
      self[:validada]
    elsif respond_to?(:status) && status.to_s.strip.length > 0
      status.to_s.strip.upcase.start_with?('VALIDAD')
    else
      false
    end
  end

  def validada=(value)
    boolean_value = ActiveModel::Type::Boolean.new.cast(value)
    if has_attribute?(:validada)
      self[:validada] = boolean_value
    elsif respond_to?(:status=)
      self.status = boolean_value ? 'VALIDADO' : 'PENDENTE'
    end
  end

  def as_map_json
    {
      id: respond_to?(:id) ? id : nil,
      codigo_totvs: respond_to?(:codigo_totvs) ? codigo_totvs : nil,
      nome: respond_to?(:nome) ? nome : desc_igreja,
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

church = Church.new
church.id = "123"
church.codigo_totvs = "10001"
church.nome = "Igreja Sede Central"
church.porte = "ESTADUAL"
church.endereco = "Av. Principal, 100"
church.bairro = "Centro"
church.municipio = "São Paulo"
church.estado = "SP"
church.cep = "01000-000"
church.latitude = -23.5505
church.longitude = -46.6333
church.status = "VALIDADO"
church.link_google_maps = "https://maps.google.com/?q=-23.5505,-46.6333"

json_output = church.as_map_json
puts "JSON output:"
puts JSON.pretty_generate(json_output)

# Assertions
raise "Invalid codigo_totvs" unless json_output[:codigo_totvs] == "10001"
raise "Invalid nome" unless json_output[:nome] == "Igreja Sede Central"
raise "Invalid validada boolean" unless json_output[:validada] == true

puts "ALL TESTS PASSED SUCCESSFULLY!"
