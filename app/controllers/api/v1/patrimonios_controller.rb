# frozen_string_literal: true

module Api
  module V1
    class PatrimoniosController < ApplicationController
      def dashboard
        stats = Patrimonio::DashboardStatsService.call(params)
        render json: { success: true, data: stats }
      rescue StandardError => e
        render json: { success: false, error: e.message }, status: :internal_server_error
      end

      def submeter_publico
        totvs = params[:codigo_totvs].to_s.strip
        if totvs.blank?
          render json: { success: false, error: 'Código TOTVS é obrigatório' }, status: :bad_request
          return
        end

        igreja = Igreja.find_by(codigo_totvs: totvs)
        if igreja.nil?
          render json: { success: false, error: "Congregação com código TOTVS #{totvs} não encontrada" }, status: :not_found
          return
        end

        ano = params[:ano_referencia].presence&.to_i || Time.current.year
        nome_resp = params[:nome_responsavel].to_s.strip
        tel_resp = params[:telefone_responsavel].to_s.strip

        submissao = nil
        ActiveRecord::Base.transaction do
          submissao = PatrimonioSubmissao.find_or_initialize_by(
            codigo_totvs: totvs,
            ano_referencia: ano
          )

          submissao.nome_responsavel = nome_resp
          submissao.telefone_responsavel = tel_resp
          submissao.data_envio = Time.current
          submissao.observacoes = params[:observacoes] if params[:observacoes].present?
          submissao.save!

          submissao.patrimonio_itens.destroy_all

          raw_itens = params[:itens] || []
          raw_itens.each do |item_params|
            item_nome = item_params[:item_nome].to_s.strip
            next if item_nome.blank?

            submissao.patrimonio_itens.create!(
              item_nome: item_nome,
              quantidade: item_params[:quantidade].to_i,
              possui: item_params[:possui].presence || 'Sim',
              conservacao: item_params[:conservacao].presence || 'BOM',
              estado_conservacao: item_params[:conservacao].presence || 'BOM',
              observacao: item_params[:observacao]
            )
          end

          igreja.update!(
            dirigente_nome: nome_resp.presence || igreja.dirigente_nome,
            dirigente_telefone: tel_resp.presence || igreja.dirigente_telefone
          )
        end

        render json: {
          success: true,
          data: {
            submissao_id: submissao.id,
            codigo_totvs: totvs,
            ano_referencia: ano,
            itens_salvos: submissao.patrimonio_itens.count
          }
        }
      rescue StandardError => e
        render json: { success: false, error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
