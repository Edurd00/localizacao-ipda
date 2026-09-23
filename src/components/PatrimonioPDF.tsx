'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
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
  item_nome?: string;
  item?: string;
  nome_item?: string;
  descricao?: string;
  quantidade?: number | string;
  qtd?: number | string;
  possui?: string;
  conservacao?: string;
  estado_conservacao?: string;
  estado?: string;
  observacao?: string | null;
}

interface PatrimonioPDFProps {
  submissao: PatrimonioSubmissao;
  itens: PatrimonioItem[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 15,
    paddingBottom: 25,
    paddingHorizontal: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#3b82f6',
    alignItems: 'flex-start',
  },
  logo: {
    width: 45,
    height: 45,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 4,
  },
  infoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoItem: {
    width: '50%',
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 7,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 8.5,
    color: '#0f172a',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableHeaderCellItem: {
    width: '28%',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textAlign: 'left',
  },
  tableHeaderCellQtd: {
    width: '10%',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textAlign: 'center',
  },
  tableHeaderCellCons: {
    width: '18%',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textAlign: 'center',
  },
  tableHeaderCellObs: {
    width: '44%',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textAlign: 'left',
  },
  tableRowEven: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableRowOdd: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableCellItem: {
    width: '28%',
    fontSize: 8,
    color: '#0f172a',
    textAlign: 'left',
  },
  tableCellQtd: {
    width: '10%',
    fontSize: 8,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  tableCellConsContainer: {
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgeYellow: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeDefault: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  tableCellObs: {
    width: '44%',
    fontSize: 7.5,
    color: '#475569',
    textAlign: 'left',
  },
  emptyText: {
    padding: 8,
    fontSize: 8,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: '#64748b',
  },
});

export default function PatrimonioPDF({ submissao, itens }: PatrimonioPDFProps) {
  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/img/logo.png`
      : '/img/logo.png';

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

  const renderConservacaoBadge = (conservacaoRaw?: string | null) => {
    const cons = (conservacaoRaw || '').trim().toUpperCase();
    if (cons === 'ÓTIMO' || cons === 'OTIMO' || cons === 'BOM') {
      return <Text style={[styles.badge, styles.badgeGreen]}>{cons || 'BOM'}</Text>;
    }
    if (cons === 'REGULAR') {
      return <Text style={[styles.badge, styles.badgeYellow]}>REGULAR</Text>;
    }
    if (cons === 'RUIM') {
      return <Text style={[styles.badge, styles.badgeRed]}>RUIM</Text>;
    }
    return <Text style={[styles.badge, styles.badgeDefault]}>{cons || '-'}</Text>;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <Text style={styles.title}>RELATÓRIO OFICIAL DE PATRIMÔNIO - IPDA</Text>
          <Text style={styles.subtitle}>
            Igreja Pentecostal Deus é Amor • Código TOTVS: {submissao.codigo_totvs}
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
            <Text style={styles.tableHeaderCellObs}>Observação</Text>
          </View>

          {validItems.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum item marcado como existente neste relatório.</Text>
          ) : (
            validItems.map((item, idx) => {
              const cons = item.conservacao || item.estado_conservacao || item.estado || '';
              const obs = item.observacao && item.observacao.trim() !== '' ? item.observacao : '-';
              return (
                <View key={item.id || idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                  <Text style={styles.tableCellItem}>
                    {item.item_nome || item.item || item.nome_item || item.descricao || '---'}
                  </Text>
                  <Text style={styles.tableCellQtd}>
                    {item.quantidade ?? item.qtd ?? '---'}
                  </Text>
                  <View style={styles.tableCellConsContainer}>
                    {renderConservacaoBadge(cons)}
                  </View>
                  <Text style={styles.tableCellObs}>
                    {obs}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>SISTEMA DE GESTÃO E INTELIGÊNCIA PATRIMONIAL IPDA</Text>
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
