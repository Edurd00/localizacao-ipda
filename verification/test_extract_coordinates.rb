require 'json'

# Test ExtractCoordinatesService directly
require_relative '../app/services/extract_coordinates_service.rb'

test_cases = [
  { input: "https://www.google.com/maps?q=-23.55052,-46.633308", expected_lat: -23.55052, expected_lng: -46.633308 },
  { input: "Igreja SP https://maps.google.com/?q=-3.4321855,-60.2822417", expected_lat: -3.4321855, expected_lng: -60.2822417 },
  { input: "Segue localização: -23.3275, -46.7275", expected_lat: -23.3275, expected_lng: -46.7275 }
]

test_cases.each_with_index do |test_case, idx|
  result = ExtractCoordinatesService.new(test_case[:input]).call
  puts "Test Case #{idx + 1}: #{result.inspect}"

  raise "Test Case #{idx + 1} failed" unless result[:success]
  raise "Test Case #{idx + 1} lat mismatch" unless (result[:latitude] - test_case[:expected_lat]).abs < 0.0001
  raise "Test Case #{idx + 1} lng mismatch" unless (result[:longitude] - test_case[:expected_lng]).abs < 0.0001
end

puts "EXTRACT COORDINATES SERVICE VERIFICATION SUCCESSFUL!"
