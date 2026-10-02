class PatrimonioSubmissao < ApplicationRecord
  self.table_name = 'patrimonio_submissoes'

  belongs_to :igreja, foreign_key: :codigo_totvs, primary_key: :codigo_totvs, optional: true
  has_many :patrimonio_itens, foreign_key: :submissao_id, dependent: :destroy
end
