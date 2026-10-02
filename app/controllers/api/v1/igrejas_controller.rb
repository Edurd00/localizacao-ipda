# frozen_string_literal: true

module Api
  module V1
    class IgrejasController < ApplicationController
      def validadas
        igrejas = Igreja.where("LOWER(status) LIKE 'validad%' OR UPPER(status) IN ('VALIDADO', 'VALIDADA')")
                        .where.not(latitude: [nil, 0])
                        .where.not(longitude: [nil, 0])
                        .order(desc_igreja: :asc)

        render json: { success: true, data: igrejas }
      end

      def organizacao
        igrejas = Igreja.where.not(status: 'DESATIVADO').order(desc_igreja: :asc)

        nodes = igrejas.map do |ig|
          {
            id: ig.id,
            codigo_totvs: ig.codigo_totvs,
            desc_igreja: ig.desc_igreja,
            porte: ig.porte || 'LOCAL',
            codigo_totvs_pai: ig.codigo_totvs_pai,
            estado: ig.estado,
            municipio: ig.municipio,
            bairro: ig.bairro,
            status: ig.status
          }
        end

        # Group by parent TOTVS code for fast hierarchical tree construction
        grouped = nodes.group_by { |n| n[:codigo_totvs_pai].to_s.strip.downcase.presence }

        tree = (grouped[nil] || []).map do |root|
          build_tree_node(root, grouped)
        end

        render json: { success: true, total: nodes.size, data: tree }
      end

      def expandir_link
        link = params[:link].presence || params[:url].presence || params[:link_google_maps].presence
        coords = GoogleMaps::ExtractCoordinatesService.call(link)

        if coords
          render json: { success: true, data: coords }
        else
          render json: { success: false, error: 'Não foi possível extrair coordenadas do link informado' }, status: :bad_request
        end
      end

      def salvar_localizacao
        totvs_code = params[:codigo_totvs] || params[:id]
        igreja = Igreja.find_by(codigo_totvs: totvs_code) || Igreja.find_by(id: totvs_code)

        if igreja.nil?
          render json: { success: false, error: 'Igreja não encontrada' }, status: :not_found
          return
        end

        lat = params[:latitude].presence&.to_f
        lng = params[:longitude].presence&.to_f
        novo_status = params[:status].presence || 'VALIDADO'

        alteracoes = {}
        alteracoes[:latitude] = { de: igreja.latitude, para: lat } if lat && lat != igreja.latitude
        alteracoes[:longitude] = { de: igreja.longitude, para: lng } if lng && lng != igreja.longitude
        alteracoes[:status] = { de: igreja.status, para: novo_status } if novo_status != igreja.status

        igreja.latitude = lat if lat
        igreja.longitude = lng if lng
        igreja.status = novo_status
        igreja.validado_por = params[:usuario_validador] if params[:usuario_validador].present?
        igreja.data_validacao = Time.current.iso8601

        if igreja.save
          if alteracoes.any?
            HistoricoIgreja.create(
              codigo_totvs: igreja.codigo_totvs,
              usuario_nome: params[:usuario_nome].presence || 'Usuário',
              usuario_email: params[:usuario_email].presence || '',
              acao: 'VALIDACAO_LOCALIZACAO',
              detalhes: alteracoes
            )
          end

          render json: { success: true, data: igreja }
        else
          render json: { success: false, errors: igreja.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def build_tree_node(node, grouped)
        key = node[:codigo_totvs].to_s.strip.downcase.presence
        children = (grouped[key] || []).map { |child| build_tree_node(child, grouped) }

        node.merge(filhas: children, total_filhas: children.size)
      end
    end
  end
end
