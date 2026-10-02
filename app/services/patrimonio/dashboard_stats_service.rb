# frozen_string_literal: true

module Patrimonio
  class DashboardStatsService
    OFFICIAL_CATEGORIES = ['Ótimo', 'Bom', 'Regular', 'Ruim'].freeze

    def self.call(params = {})
      new(params).call
    end

    def initialize(params = {})
      @params = params
    end

    def call
      items = fetch_filtered_items

      total_items = items.sum(:quantidade).to_i
      ruim_count = items.select { |item| normalize_conservacao(item) == 'Ruim' }.sum(&:quantidade).to_i

      submissoes_scope = fetch_submissoes_scope
      total_submissoes = submissoes_scope.count
      media_por_templo = total_submissoes.positive? ? (total_items.to_f / total_submissoes).round(1) : 0.0

      conservacao_breakdown = calculate_conservacao_breakdown(items)
      categorias_breakdown = calculate_categorias_breakdown(items)

      {
        totais: {
          total_itens: total_items,
          estado_ruim: ruim_count,
          media_por_templo: media_por_templo,
          total_submissoes: total_submissoes
        },
        conservacao: conservacao_breakdown,
        categorias: categorias_breakdown
      }
    end

    private

    def fetch_filtered_items
      items_scope = PatrimonioItem.com_quantidade.joins(:patrimonio_submissao)

      if @params[:regiao].present? && @params[:regiao] != 'ALL'
        items_scope = items_scope.joins(patrimonio_submissao: :igreja)
      end

      if @params[:estado].present? && @params[:estado] != 'ALL'
        items_scope = items_scope.joins(patrimonio_submissao: :igreja).where(igrejas: { estado: @params[:estado] })
      end

      if @params[:porte].present? && @params[:porte] != 'ALL'
        items_scope = items_scope.joins(patrimonio_submissao: :igreja).where(igrejas: { porte: @params[:porte] })
      end

      if @params[:estado_item].present? && @params[:estado_item].to_s.upcase == 'RUIM'
        items_scope = items_scope.where(
          "UPPER(TRIM(COALESCE(patrimonio_itens.conservacao, patrimonio_itens.estado_conservacao, 'REGULAR'))) = 'RUIM'"
        )
      end

      items_scope
    end

    def fetch_submissoes_scope
      submissoes = PatrimonioSubmissao.all
      if @params[:estado].present? && @params[:estado] != 'ALL'
        submissoes = submissoes.joins(:igreja).where(igrejas: { estado: @params[:estado] })
      end
      if @params[:porte].present? && @params[:porte] != 'ALL'
        submissoes = submissoes.joins(:igreja).where(igrejas: { porte: @params[:porte] })
      end
      submissoes
    end

    def normalize_conservacao(item)
      raw = if item.respond_to?(:conservacao) && item.conservacao.present?
              item.conservacao
            elsif item.respond_to?(:estado_conservacao) && item.estado_conservacao.present?
              item.estado_conservacao
            end

      clean = raw.to_s.strip.upcase

      case clean
      when 'ÓTIMO', 'OTIMO'
        'Ótimo'
      when 'BOM'
        'Bom'
      when 'RUIM'
        'Ruim'
      else
        'Regular'
      end
    end

    def calculate_conservacao_breakdown(items)
      counts = { 'Ótimo' => 0, 'Bom' => 0, 'Regular' => 0, 'Ruim' => 0 }

      items.each do |item|
        cat = normalize_conservacao(item)
        counts[cat] += item.quantidade.to_i
      end

      OFFICIAL_CATEGORIES.map do |cat|
        { estado: cat, conservacao: cat, quantidade: counts[cat] || 0 }
      end
    end

    def calculate_categorias_breakdown(items)
      categories = Hash.new(0)

      items.each do |item|
        name = item.item_nome.to_s.upcase
        cat = categorize_item_name(name)
        categories[cat] += item.quantidade.to_i
      end

      categories.map do |cat, qty|
        { nome: cat, total: qty, quantidade: qty }
      end.sort_by { |c| -c[:total] }
    end

    def categorize_item_name(name)
      if name.match?(/(BANCO|CADEIRA|MESA|ARMÁRIO|ARMARIO|BEBEDOURO|PÚLPITO|PULPITO|COFRE)/)
        'Mobiliário e Estrutura'
      elsif name.match?(/(AR CONDICIONADO|VENTILADOR|TELEVISÃO|TELEVISAO|PROJETOR|COMPUTADOR)/)
        'Eletrônicos e Climatização'
      elsif name.match?(/(SOM|MICROFONE|CAIXA|INSTRUMENTO|TECLADO|VIOLÃO|VIOLAO)/)
        'Som e Instrumentos'
      elsif name.match?(/(FOGÃO|FOGAO|GELADEIRA|FREEZER|CÂMERA|CAMERA|ALARME)/)
        'Cozinha e Segurança'
      else
        'Adicionais e Outros'
      end
    end
  end
end
