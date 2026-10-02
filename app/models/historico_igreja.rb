class HistoricoIgreja < ApplicationRecord
  self.table_name = 'historico_igrejas'

  belongs_to :igreja, foreign_key: :codigo_totvs, primary_key: :codigo_totvs, optional: true
end
