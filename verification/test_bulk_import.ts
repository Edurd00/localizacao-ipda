import { getIgrejas, saveIgrejasBulk, Igreja } from '../src/lib/db';

async function runTests() {
  console.log('--- STARTING BULK IMPORT UNIT TESTS ---');

  // =========================================================================
  // PART 1: Standard SA1 TOTVS Import Rules (isReclassificacao = false / default)
  // =========================================================================
  console.log('\n--- PART 1: Testing Standard SA1 TOTVS Import Rules ---');

  // Test Case 1.1: Protection of Validated Churches (Status 'VALIDADO')
  console.log('Testing: Protection of Validated Churches');
  const initialChurchesRes = await getIgrejas();
  const initialChurches = initialChurchesRes.data;
  const c10001Initial = initialChurches.find(c => c.codigo_totvs === '10001');
  if (!c10001Initial) {
    throw new Error('Initial church 10001 not found.');
  }
  console.log('10001 Initial Status:', c10001Initial.status);
  console.log('10001 Initial Address:', c10001Initial.endereco);

  // Try to bulk import 10001 with a divergent address and coordinates under standard rules
  const newImportData: Igreja[] = [
    {
      codigo_totvs: '10001',
      desc_igreja: 'UPDATED Estadual Central de São Paulo - IPDA',
      tipo_imovel: 'ALUGADO',
      endereco: 'Novo Endereco Divergente, 9999',
      bairro: 'Novo Bairro',
      municipio: 'Sao Paulo',
      estado: 'SP',
      cep: '00000-000',
      link_google_maps: 'https://maps.google.com/?q=-22,-45',
      latitude: -22,
      longitude: -45,
      status: 'PENDENTE',
    }
  ];

  console.log('Importing church 10001 with divergent address (isReclassificacao = false)...');
  await saveIgrejasBulk(newImportData);

  const updatedChurchesRes = await getIgrejas();
  const updatedChurches = updatedChurchesRes.data;
  const c10001Updated = updatedChurches.find(c => c.codigo_totvs === '10001')!;

  console.log('10001 Updated Status:', c10001Updated.status);
  console.log('10001 Updated Address:', c10001Updated.endereco);
  console.log('10001 Updated Coordinates:', c10001Updated.latitude, c10001Updated.longitude);

  if (c10001Updated.status !== 'PENDENTE_REVISAO') {
    throw new Error(`FAIL: Status should be PENDENTE_REVISAO, got ${c10001Updated.status}`);
  }
  if (c10001Updated.endereco !== 'Avenida do Estado, 4567') {
    throw new Error(`FAIL: Address should NOT have been overwritten. Got: '${c10001Updated.endereco}'`);
  }
  if (c10001Updated.latitude !== -23.55052 || c10001Updated.longitude !== -46.633308) {
    throw new Error(`FAIL: Coordinates should NOT have been overwritten.`);
  }
  console.log('✅ PASS: Validated church protected and status updated to PENDENTE_REVISAO on standard import.');

  // Test Case 1.2: Preservação de Coligações Hierárquicas
  console.log('\nTesting: Preservação de Coligações Hierárquicas (isReclassificacao = false)');
  const test10003: Igreja = {
    codigo_totvs: '10003',
    desc_igreja: 'Central Teste 10003',
    tipo_imovel: 'PRÓPRIO',
    endereco: 'Rua de Teste, 123',
    bairro: 'Bairro Teste',
    municipio: 'Cidade Teste',
    estado: 'SP',
    cep: '11111-111',
    link_google_maps: 'https://maps.google.com',
    latitude: -23,
    longitude: -46,
    status: 'PENDENTE',
    codigo_totvs_pai: '10001',
  };

  await saveIgrejasBulk([test10003]);

  const import10003: Igreja = {
    codigo_totvs: '10003',
    desc_igreja: 'Central Teste 10003 Modificado',
    tipo_imovel: 'ALUGADO',
    endereco: 'Rua de Teste Modificada, 456',
    bairro: 'Bairro Teste Modificado',
    municipio: 'Cidade Teste Modificada',
    estado: 'RJ',
    cep: '22222-222',
    link_google_maps: 'https://maps.google.com/different',
    latitude: -22,
    longitude: -43,
    status: 'PENDENTE',
    codigo_totvs_pai: '10002', // Attempting to change parent
  };

  await saveIgrejasBulk([import10003]);

  const c10003Updated = (await getIgrejas()).data.find(c => c.codigo_totvs === '10003')!;
  console.log('10003 Parent:', c10003Updated.codigo_totvs_pai);
  console.log('10003 Address:', c10003Updated.endereco);

  if (c10003Updated.codigo_totvs_pai !== '10001') {
    throw new Error(`FAIL: Parent was overwritten under standard import rules!`);
  }
  console.log('✅ PASS: Parent was preserved on standard import.');


  // =========================================================================
  // PART 2: Reclassificação Import Rules (isReclassificacao = true)
  // =========================================================================
  console.log('\n--- PART 2: Testing Reclassificação Import Rules ---');

  // Let's reset 10002 first to make sure it is VALIDADO, has coordinates, and parent is '10001'
  console.log('Setting up 10002 as VALIDADO with parent 10001...');
  const setup10002: Igreja = {
    codigo_totvs: '10002',
    desc_igreja: 'Central Franco da Rocha',
    tipo_imovel: 'ALUGADO',
    endereco: 'Rua Basílio Fazzi, 120',
    bairro: 'Centro',
    municipio: 'Franco da Rocha',
    estado: 'SP',
    cep: '07850-340',
    link_google_maps: 'https://maps.google.com/?q=-23.3275,-46.7275',
    latitude: -23.3275,
    longitude: -46.7275,
    status: 'VALIDADO',
    codigo_totvs_pai: '10001',
  };
  await saveIgrejasBulk([setup10002]);

  const c10002Initial = (await getIgrejas()).data.find(c => c.codigo_totvs === '10002')!;
  console.log('10002 Initial Status:', c10002Initial.status);
  console.log('10002 Initial Address:', c10002Initial.endereco);
  console.log('10002 Initial Parent:', c10002Initial.codigo_totvs_pai);

  // Test Case 2.1: Reclassificação with Identical Address (Status stays VALIDADO, pre-existing parent MUST NOT be overwritten)
  console.log('\nTesting Case 2.1: Reclassificação with IDENTICAL Address (Blindagem do Pai)');
  const import10002Identical: Igreja = {
    codigo_totvs: '10002',
    desc_igreja: 'Central Franco da Rocha - NOVA DESCRICAO',
    tipo_imovel: 'PRÓPRIO',
    endereco: 'Rua Basílio Fazzi, 120', // Identical address
    bairro: 'Centro',
    municipio: 'Franco da Rocha',
    estado: 'SP',
    cep: '07850-340',
    link_google_maps: 'https://maps.google.com/?q=new',
    latitude: -23.111,
    longitude: -46.111,
    status: 'PENDENTE',
    codigo_totvs_pai: '10003', // Trying to change parent
  };

  await saveIgrejasBulk([import10002Identical], { isReclassificacao: true });

  const c10002IdenticalRes = (await getIgrejas()).data.find(c => c.codigo_totvs === '10002')!;
  console.log('10002 Status after Identical import:', c10002IdenticalRes.status);
  console.log('10002 Parent after Identical import:', c10002IdenticalRes.codigo_totvs_pai);
  console.log('10002 Address after Identical import:', c10002IdenticalRes.endereco);

  if (c10002IdenticalRes.status !== 'VALIDADO') {
    throw new Error(`FAIL: Status should remain VALIDADO when address is identical. Got ${c10002IdenticalRes.status}`);
  }
  // CRITICAL CHECK: Inviolabilidade de coligação manual!
  if (c10002IdenticalRes.codigo_totvs_pai !== '10001') {
    throw new Error(`FAIL: Pre-existing parent link ('10001') was overwritten under Reclassificação! Got ${c10002IdenticalRes.codigo_totvs_pai}`);
  }
  console.log('✅ PASS: VALIDADO status kept intact, and pre-existing manual parent is strictly blindado/preserved.');

  // Test Case 2.2: Reclassificação with CHANGED Address (Status -> REVISAO_ENDERECO, physical fields updated, coordinates preserved, parent preserved)
  console.log('\nTesting Case 2.2: Reclassificação with CHANGED Address (Blindagem do Pai)');
  const import10002Changed: Igreja = {
    codigo_totvs: '10002',
    desc_igreja: 'Central Franco da Rocha - DESCRICAO RECLASS',
    tipo_imovel: 'PRÓPRIO',
    endereco: 'Nova Avenida de Franco da Rocha, 500', // Changed address!
    bairro: 'Novo Bairro Franco',
    municipio: 'Franco da Rocha',
    estado: 'SP',
    cep: '07850-999',
    link_google_maps: 'https://maps.google.com/changed',
    latitude: -11.111,
    longitude: -22.222,
    status: 'PENDENTE',
    codigo_totvs_pai: '10003', // Trying to change parent again
  };

  await saveIgrejasBulk([import10002Changed], { isReclassificacao: true });

  const c10002ChangedRes = (await getIgrejas()).data.find(c => c.codigo_totvs === '10002')!;
  console.log('10002 Status after Changed import:', c10002ChangedRes.status);
  console.log('10002 Parent after Changed import:', c10002ChangedRes.codigo_totvs_pai);
  console.log('10002 Address after Changed import:', c10002ChangedRes.endereco);
  console.log('10002 Coordinates after Changed import:', c10002ChangedRes.latitude, c10002ChangedRes.longitude);

  if (c10002ChangedRes.status !== 'REVISAO_ENDERECO') {
    throw new Error(`FAIL: Status should be REVISAO_ENDERECO due to address change. Got ${c10002ChangedRes.status}`);
  }
  if (c10002ChangedRes.endereco !== 'Nova Avenida de Franco da Rocha, 500') {
    throw new Error(`FAIL: Address should have been updated to new address.`);
  }
  if (c10002ChangedRes.latitude !== -23.3275 || c10002ChangedRes.longitude !== -46.7275) {
    throw new Error(`FAIL: Coordinates should NOT have been overwritten. Got ${c10002ChangedRes.latitude}, ${c10002ChangedRes.longitude}`);
  }
  // CRITICAL CHECK: Inviolabilidade de coligação manual!
  if (c10002ChangedRes.codigo_totvs_pai !== '10001') {
    throw new Error(`FAIL: Parent link should have been preserved.`);
  }
  console.log('✅ PASS: Status set to REVISAO_ENDERECO, physical address fields updated, and manual parent link and coordinates preserved.');

  // Test Case 2.3: Reclassificação preenche lacuna se estiver nulo
  console.log('\nTesting Case 2.3: Reclassificação preenche lacuna de pai nulo');
  const test10004: Igreja = {
    codigo_totvs: '10004',
    desc_igreja: 'Central Teste 10004',
    tipo_imovel: 'PRÓPRIO',
    endereco: 'Rua de Teste, 789',
    bairro: 'Bairro 4',
    municipio: 'Cidade 4',
    estado: 'SP',
    cep: '44444-444',
    link_google_maps: 'https://maps.google.com',
    latitude: -23.4,
    longitude: -46.4,
    status: 'PENDENTE',
    codigo_totvs_pai: null, // No parent configured
  };
  await saveIgrejasBulk([test10004]);

  const import10004: Igreja = {
    codigo_totvs: '10004',
    desc_igreja: 'Central Teste 10004',
    tipo_imovel: 'PRÓPRIO',
    endereco: 'Rua de Teste, 789',
    bairro: 'Bairro 4',
    municipio: 'Cidade 4',
    estado: 'SP',
    cep: '44444-444',
    link_google_maps: 'https://maps.google.com',
    latitude: -23.4,
    longitude: -46.4,
    status: 'PENDENTE',
    codigo_totvs_pai: '10001', // Parent from sheet
  };
  await saveIgrejasBulk([import10004], { isReclassificacao: true });

  const c10004Res = (await getIgrejas()).data.find(c => c.codigo_totvs === '10004')!;
  console.log('10004 Parent after filling lacuna:', c10004Res.codigo_totvs_pai);
  if (c10004Res.codigo_totvs_pai !== '10001') {
    throw new Error('FAIL: Parent should have been updated to 10001 since it was previously null.');
  }
  console.log('✅ PASS: Parent successfully filled from Reclassificação because it was currently null.');

  console.log('\n--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
