import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { fakerPT_BR as faker } from '@faker-js/faker';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!pool) {
    return NextResponse.json(
      { success: false, error: 'Database pool não está configurado.' },
      { status: 500 }
    );
  }

  const client = await pool.connect();
  try {
    // 1. Criar tabelas igrejas e historico_igrejas caso não existam
    await client.query(`
      CREATE TABLE IF NOT EXISTS igrejas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        codigo_totvs VARCHAR(50) UNIQUE NOT NULL,
        desc_igreja VARCHAR(255) NOT NULL,
        tipo_imovel VARCHAR(50),
        endereco VARCHAR(255),
        bairro VARCHAR(100),
        municipio VARCHAR(100),
        estado VARCHAR(10),
        cep VARCHAR(20),
        link_google_maps TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        status VARCHAR(50) DEFAULT 'VALIDADO',
        usuario_validador VARCHAR(100),
        codigo_totvs_pai VARCHAR(50),
        porte VARCHAR(50),
        dirigente_nome VARCHAR(255),
        dirigente_telefone VARCHAR(50),
        dirigente_email VARCHAR(255),
        dirigente_data_posse DATE,
        financeira_nome VARCHAR(255),
        financeira_telefone VARCHAR(50),
        financeira_email VARCHAR(255),
        qtd_membros INTEGER,
        qtd_jovens INTEGER,
        tipo_prebenda VARCHAR(50),
        validado_por VARCHAR(100),
        validado_em TIMESTAMP,
        data_validacao TIMESTAMP,
        observacoes TEXT,
        observacao TEXT,
        observacao_duvida TEXT,
        duvida TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS historico_igrejas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        codigo_totvs VARCHAR(50) NOT NULL,
        usuario_nome VARCHAR(255),
        usuario_email VARCHAR(255),
        acao VARCHAR(100) NOT NULL,
        detalhes JSONB,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Limpa dados anteriores para garantir 300 congregações limpas
    await client.query('TRUNCATE TABLE historico_igrejas, igrejas RESTART IDENTITY CASCADE;');

    // 2. Geração de Igrejas (300 congregações)
    const sedes: string[] = [];
    const generatedIgrejas = [];
    const BR_STATES = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF', 'ES', 'MT', 'MS', 'AM', 'PA'];

    for (let i = 0; i < 300; i++) {
      const isSede = i < 10;
      const codigo_totvs = (10000 + i + Math.floor(Math.random() * 89999)).toString();
      const city = faker.location.city();
      const state = faker.helpers.arrayElement(BR_STATES);
      const desc_igreja = isSede ? `Sede ${city}` : `Filial ${city}`;
      const tipo_imovel = faker.helpers.arrayElement(['Alugado', 'Próprio']);
      const status = 'VALIDADO';

      const street = faker.location.streetAddress();
      const bairro = faker.location.secondaryAddress() || 'Centro';
      const cep = faker.location.zipCode('#####-###');

      // Coordenadas válidas no Brasil (Lat entre -30 e 0, Lng entre -60 e -40)
      const latitude = faker.number.float({ min: -30, max: 0, fractionDigits: 6 });
      const longitude = faker.number.float({ min: -60, max: -40, fractionDigits: 6 });

      const dirigente_nome = faker.person.fullName();
      const qtd_membros = faker.number.int({ min: 10, max: 500 });
      const porte = isSede ? 'SEDE' : 'LOCAL';

      let codigo_totvs_pai: string | null = null;
      if (isSede) {
        sedes.push(codigo_totvs);
      } else {
        codigo_totvs_pai = faker.helpers.arrayElement(sedes);
      }

      const link_google_maps = `https://maps.google.com/?q=${latitude},${longitude}`;

      generatedIgrejas.push({
        codigo_totvs,
        desc_igreja,
        tipo_imovel,
        status,
        endereco: street,
        bairro,
        municipio: city,
        estado: state,
        cep,
        latitude,
        longitude,
        link_google_maps,
        dirigente_nome,
        qtd_membros,
        porte,
        codigo_totvs_pai,
      });
    }

    // Inserção no banco usando pool.query
    for (const ig of generatedIgrejas) {
      await client.query(
        `INSERT INTO igrejas (
          codigo_totvs, desc_igreja, tipo_imovel, status,
          endereco, bairro, municipio, estado, cep,
          latitude, longitude, link_google_maps,
          dirigente_nome, qtd_membros, porte, codigo_totvs_pai,
          usuario_validador
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          ig.codigo_totvs,
          ig.desc_igreja,
          ig.tipo_imovel,
          ig.status,
          ig.endereco,
          ig.bairro,
          ig.municipio,
          ig.estado,
          ig.cep,
          ig.latitude,
          ig.longitude,
          ig.link_google_maps,
          ig.dirigente_nome,
          ig.qtd_membros,
          ig.porte,
          ig.codigo_totvs_pai,
          'admin@geomanager.com',
        ]
      );
    }

    // 3. Geração de Histórico (50 igrejas aleatórias)
    const randomChurches = faker.helpers.arrayElements(generatedIgrejas, 50);

    for (const church of randomChurches) {
      const historyCount = faker.number.int({ min: 1, max: 3 });
      for (let h = 0; h < historyCount; h++) {
        await client.query(
          `INSERT INTO historico_igrejas (
            codigo_totvs, usuario_nome, usuario_email, acao, detalhes, criado_em
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            church.codigo_totvs,
            'Admin Portfólio',
            'admin@geomanager.com',
            'EDICAO_DADOS',
            JSON.stringify({
              alteracao: 'Atualização de cadastro e validação de geolocalização',
              data: faker.date.recent({ days: 30 }),
            }),
            faker.date.recent({ days: 60 }),
          ]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Banco de dados populado com dados fictícios com sucesso!',
      totalIgrejas: generatedIgrejas.length,
      totalSedes: sedes.length,
      historicosGerados: randomChurches.length,
    });
  } catch (err: any) {
    console.error('Error seeding fake data:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao popular o banco de dados.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
