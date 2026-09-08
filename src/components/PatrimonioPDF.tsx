'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

export interface PatrimonioSubmissao {
  id: string;
  codigo_totvs: string;
  desc_igreja?: string | null;
  municipio?: string | null;
  nome_responsavel?: string | null;
  telefone_responsavel?: string | null;
  ano_referencia?: number | string | null;
  data_envio?: string | null;
  criado_em?: string | null;
  created_at?: string | null;
}

export interface PatrimonioItem {
  id: string;
  submissao_id?: string;
  item?: string;
  nome_item?: string;
  descricao?: string;
  quantidade?: number | string;
  qtd?: number | string;
  possui?: string;
  conservacao?: string;
  estado_conservacao?: string;
  estado?: string;
}

interface PatrimonioPDFProps {
  submissao: PatrimonioSubmissao;
  itens: PatrimonioItem[];
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#4f46e5',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1e1b4b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoItem: {
    width: '50%',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 10,
    color: '#111827',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e1b4b',
    marginTop: 16,
    marginBottom: 8,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCellItem: {
    flex: 3,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  tableHeaderCellQtd: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableHeaderCellCons: {
    flex: 2,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  tableRowEven: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowOdd: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCellItem: {
    flex: 3,
    fontSize: 9,
    color: '#111827',
  },
  tableCellQtd: {
    flex: 1,
    fontSize: 9,
    color: '#1e1b4b',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  tableCellCons: {
    flex: 2,
    fontSize: 9,
    color: '#4b5563',
  },
  emptyText: {
    padding: 12,
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
});

export default function PatrimonioPDF({ submissao, itens }: PatrimonioPDFProps) {
  const validItems = (itens || []).filter((item) => {
    const val = String(item.possui || '').trim().toLowerCase();
    return val === 'sim' || val === 's' || val === 'true';
  });

  const formatDate = (rawDate?: string | null) => {
    if (!rawDate) return '---';
    try {
      const d = new Date(rawDate);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('pt-BR');
    } catch {
      return '---';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>GEO-VALIG • Relatório de Patrimônio</Text>
          <Text style={styles.subtitle}>
            IPDA - Igreja Pentecostal Deus é Amor • Código TOTVS: {submissao.codigo_totvs}
          </Text>

          {/* Info Card Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Igreja / Congregação</Text>
              <Text style={styles.infoValue}>
                {submissao.desc_igreja || `Igreja TOTVS ${submissao.codigo_totvs}`}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Responsável pelo Envio</Text>
              <Text style={styles.infoValue}>{submissao.nome_responsavel || '---'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Telefone de Contato</Text>
              <Text style={styles.infoValue}>{submissao.telefone_responsavel || '---'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Ano de Referência / Data de Envio</Text>
              <Text style={styles.infoValue}>
                {submissao.ano_referencia ? `Ano Ref: ${submissao.ano_referencia} • ` : ''}
                {formatDate(submissao.data_envio || submissao.criado_em || submissao.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Table Section */}
        <Text style={styles.sectionTitle}>Itens Declarados no Patrimônio</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCellItem}>Item</Text>
            <Text style={styles.tableHeaderCellQtd}>Quantidade</Text>
            <Text style={styles.tableHeaderCellCons}>Conservação</Text>
          </View>

          {validItems.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum item marcado como existente neste relatório.</Text>
          ) : (
            validItems.map((item, idx) => (
              <View key={item.id || idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                <Text style={styles.tableCellItem}>
                  {item.item_nome || item.item || item.nome_item || item.descricao || '---'}
                </Text>
                <Text style={styles.tableCellQtd}>
                  {item.quantidade ?? item.qtd ?? '---'}
                </Text>
                <Text style={styles.tableCellCons}>
                  {item.conservacao || item.estado_conservacao || item.estado || '---'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>GEO-VALIG IPDA System • Relatório de Gestão de Patrimônio</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}
