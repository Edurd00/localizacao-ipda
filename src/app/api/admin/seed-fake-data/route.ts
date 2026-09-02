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

    // Limpar as tabelas para evitar duplicidade caso a rota seja chamada mais de uma vez
    await client.query('DELETE FROM historico_igrejas;');
    await client.query('DELETE FROM igrejas;');

    // Lista de âncoras (Centros urbanos reais do Brasil)
    const anchorCities = [
      { lat: -23.5505, lng: -46.6333 }, // São Paulo
      { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
      { lat: -19.9167, lng: -43.9345 }, // Belo Horizonte
      { lat: -15.7801, lng: -47.9292 }, // Brasília
      { lat: -12.9714, lng: -38.5116 }, // Salvador
      { lat: -3.7172,  lng: -38.5431 }, // Fortaleza
      { lat: -8.0476,  lng: -34.8770 }, // Recife
      { lat: -3.1190,  lng: -60.0217 }, // Manaus
      { lat: -1.4550,  lng: -48.5024 }, // Belém
      { lat: -30.0346, lng: -51.2177 }, // Porto Alegre
      { lat: -25.4284, lng: -49.2733 }, // Curitiba
      { lat: -16.6869, lng: -49.2648 }, // Goiânia
    ];

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

      // Escolhe uma cidade base aleatória
      const base = anchorCities[Math.floor(Math.random() * anchorCities.length)];

      // Aplica um desvio (offset) aleatório de até ~150km (aprox 1.5 graus)
      const latOffset = (Math.random() - 0.5) * 3;
      const lngOffset = (Math.random() - 0.5) * 3;

      const finalLat = parseFloat((base.lat + latOffset).toFixed(6));
      const finalLng = parseFloat((base.lng + lngOffset).toFixed(6));

      const dirigente_nome = faker.person.fullName();
      const qtd_membros = faker.number.int({ min: 10, max: 500 });
      const porte = isSede ? 'SEDE' : 'LOCAL';

      let codigo_totvs_pai: string | null = null;
      if (isSede) {
        sedes.push(codigo_totvs);
      } else {
        codigo_totvs_pai = faker.helpers.arrayElement(sedes);
      }

      const link_google_maps = `https://maps.google.com/?q=${finalLat},${finalLng}`;

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
        latitude: finalLat,
        longitude: finalLng,
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
