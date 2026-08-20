import fs from 'fs';
import path from 'path';
import { getIgrejas } from '../src/lib/db';

async function exportStaticIgrejas() {
  try {
    console.log("Fetching validated churches via getIgrejas()...");
    const records = await getIgrejas({ status: 'VALIDADO' }, [
      'id',
      'codigo_totvs',
      'desc_igreja',
      'latitude',
      'longitude',
      'status',
      'porte',
      'codigo_totvs_pai',
      'estado',
      'municipio',
      'tipo_imovel',
      'endereco',
      'bairro',
      'cep',
      'link_google_maps',
      'usuario_validador',
      'validado_por',
      'validado_em',
      'updated_at',
      'dirigente_nome',
      'dirigente_telefone',
      'dirigente_email',
      'dirigente_data_posse',
      'financeira_nome',
      'financeira_telefone',
      'financeira_email',
      'qtd_membros',
      'qtd_jovens',
      'tipo_prebenda',
    ]);

    const outputDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'igrejas.json');
    const payload = {
      success: true,
      igrejas: records,
    };

    fs.writeFileSync(outputPath, JSON.stringify(payload), 'utf8');
    console.log(`Static churches asset successfully generated at ${outputPath} (${records.length} igrejas).`);
  } catch (err) {
    console.error("Error generating static churches asset:", err);
    process.exit(1);
  }
}

exportStaticIgrejas();
