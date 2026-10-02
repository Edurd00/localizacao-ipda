class Igreja < ApplicationRecord
  self.table_name = 'igrejas'
  self.primary_key = 'id'

  has_many :patrimonio_submissoes, foreign_key: :codigo_totvs, primary_key: :codigo_totvs
  has_many :historico_igrejas, foreign_key: :codigo_totvs, primary_key: :codigo_totvs

  validates :codigo_totvs, presence: true, uniqueness: true
  validates :desc_igreja, presence: true
end
