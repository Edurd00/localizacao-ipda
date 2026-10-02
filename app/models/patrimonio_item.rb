class PatrimonioItem < ApplicationRecord
  self.table_name = 'patrimonio_itens'

  belongs_to :patrimonio_submissao, foreign_key: :submissao_id, optional: true

  scope :com_quantidade, -> { where('quantidade > 0') }

  def conservacao_normalizada
    val = conservacao.presence if respond_to?(:conservacao)
    val ||= estado_conservacao.presence if respond_to?(:estado_conservacao)
    val || 'REGULAR'
  end
end
