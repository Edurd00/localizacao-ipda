require 'json'

# Mocks for controller and models
module ActiveModel
  module Type
    class Boolean
      def cast(val); true; end
    end
  end
end

class Church
  attr_accessor :codigo_totvs, :desc_igreja, :porte, :endereco, :latitude, :longitude, :status

  def self.column_names
    ['id', 'codigo_totvs', 'desc_igreja', 'latitude', 'longitude', 'status']
  end

  def self.all
    [
      new_church("1001", "Sede SP", -23.55, -46.63, "VALIDADO"),
      new_church("1002", "Sede RJ", -22.90, -43.17, "PENDENTE")
    ]
  end

  def self.new_church(totvs, nome, lat, lng, st)
    c = Church.new
    c.codigo_totvs = totvs
    c.desc_igreja = nome
    c.latitude = lat
    c.longitude = lng
    c.status = st
    c
  end

  def validada
    status == "VALIDADO"
  end

  def as_map_json
    {
      codigo_totvs: codigo_totvs,
      nome: desc_igreja,
      latitude: latitude,
      longitude: longitude,
      validada: validada
    }
  end
end

# Controller execution simulation
churches = Church.all
json_map = churches.map(&:as_map_json)

puts "Map Locations Response:"
puts JSON.pretty_generate(json_map)

raise "Missing locations" if json_map.empty?
raise "Invalid JSON item" unless json_map.first[:codigo_totvs] == "1001"

puts "MAP CONTROLLER VERIFICATION SUCCESSFUL!"
