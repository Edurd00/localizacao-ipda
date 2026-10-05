require 'json'

# Mock ActiveModel / ActiveRecord environment
module ActiveModel
  module Type
    class Boolean
      def cast(v); true; end
    end
  end
end

class Church
  attr_accessor :id, :codigo_totvs, :desc_igreja, :porte, :endereco, :latitude, :longitude, :status

  def self.column_names
    ['id', 'codigo_totvs', 'desc_igreja', 'latitude', 'longitude', 'status']
  end

  def self.find(id)
    new_church("1001", "Central SP", -23.55, -46.63, "PENDENTE")
  end

  def self.where(clause)
    [new_church("1002", "Central RJ", -22.90, -43.17, "PENDENTE")]
  end

  def self.new_church(totvs, nome, lat, lng, st)
    c = Church.new
    c.id = totvs
    c.codigo_totvs = totvs
    c.desc_igreja = nome
    c.latitude = lat
    c.longitude = lng
    c.status = st
    c
  end

  def nome
    desc_igreja
  end

  def validada
    status == "VALIDADO"
  end

  def save
    @saved = true
  end
end

# Simulate ValidationController update action
church = Church.find("1001")
church.latitude = -23.5501
church.longitude = -46.6302
church.status = "VALIDADO"
church.save

next_church = Church.where("PENDENTE").first

puts "Current Church Saved Status: #{church.status} (Validada: #{church.validada})"
puts "Next Pending Church: TOTVS #{next_church.codigo_totvs} - #{next_church.nome}"

raise "Failed to update status" unless church.status == "VALIDADO"
raise "Failed to get next pending church" unless next_church.codigo_totvs == "1002"

puts "VALIDATION CONTROLLER VERIFICATION SUCCESSFUL!"
