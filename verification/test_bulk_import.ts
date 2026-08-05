import { getIgrejas, saveIgrejasBulk, Igreja } from '../src/lib/db';

async function runTests() {
  console.log('--- STARTING BULK IMPORT UNIT TESTS ---');

  // Test Case 1: Protection of Validated Churches (Status 'VALIDADO')
  // Original 10001 has status: 'VALIDADO', address: 'Avenida do Estado, 4567', coordinates: -23.55052, -46.633308
  console.log('\nTesting: Protection of Validated Churches');
  const initialChurches = await getIgrejas();
  const c10001Initial = initialChurches.find(c => c.codigo_totvs === '10001');
  if (!c10001Initial) {
    throw new Error('Initial church 10001 not found.');
  }
  console.log('10001 Initial Status:', c10001Initial.status);
  console.log('10001 Initial Address:', c10001Initial.endereco);

  // Try to bulk import 10001 with a divergent address and coordinates
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
      status: 'PENDENTE', // Incoming is PENDENTE, but existing is VALIDADO
    }
  ];

  console.log('Importing church 10001 with divergent address...');
  const report1 = await saveIgrejasBulk(newImportData);
  console.log('Report:', report1);

  const updatedChurches = await getIgrejas();
  const c10001Updated = updatedChurches.find(c => c.codigo_totvs === '10001');
  if (!c10001Updated) {
    throw new Error('Updated church 10001 not found.');
  }

  console.log('10001 Updated Status:', c10001Updated.status);
  console.log('10001 Updated Address:', c10001Updated.endereco);
  console.log('10001 Updated Coordinates:', c10001Updated.latitude, c10001Updated.longitude);

  // Assertions for Case 1
  if (c10001Updated.status !== 'PENDENTE_REVISAO') {
    throw new Error(`FAIL: Status should be PENDENTE_REVISAO due to address divergence, got ${c10001Updated.status}`);
  }
  if (c10001Updated.endereco !== 'Avenida do Estado, 4567') {
    throw new Error(`FAIL: Address should NOT have been overwritten. Expected 'Avenida do Estado, 4567', got '${c10001Updated.endereco}'`);
  }
  if (c10001Updated.latitude !== -23.55052 || c10001Updated.longitude !== -46.633308) {
    throw new Error(`FAIL: Coordinates should NOT have been overwritten.`);
  }
  if (c10001Updated.desc_igreja !== 'Estadual Central de São Paulo - IPDA') {
    throw new Error(`FAIL: Name should NOT have been overwritten.`);
  }
  console.log('✅ PASS: Validated church successfully protected from overwriting, status correctly set to PENDENTE_REVISAO.');


  // Test Case 2: Preservação de Coligações Hierárquicas
  // Original 10002 has status: 'VALIDADO', parent: '10001'
  // Let's add a non-validated church first
  console.log('\nTesting: Preservação de Coligações Hierárquicas');
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
    codigo_totvs_pai: '10001', // Parent set manually
  };

  // Add 10003
  await saveIgrejasBulk([test10003]);

  const c10003Initial = (await getIgrejas()).find(c => c.codigo_totvs === '10003')!;
  console.log('10003 Initial Parent:', c10003Initial.codigo_totvs_pai);

  // Now, do a bulk import of 10003 with a different parent (e.g. '10002' or null) and modified address fields
  const import10003: Igreja = {
    codigo_totvs: '10003',
    desc_igreja: 'Central Teste 10003 Modificado', // Non-physical field
    tipo_imovel: 'ALUGADO', // Non-physical field
    endereco: 'Rua de Teste Modificada, 456', // Physical field
    bairro: 'Bairro Teste Modificado', // Physical field
    municipio: 'Cidade Teste Modificada', // Physical field
    estado: 'RJ', // Physical field
    cep: '22222-222', // Physical field
    link_google_maps: 'https://maps.google.com/different', // Non-physical field
    latitude: -22, // Non-physical field
    longitude: -43, // Non-physical field
    status: 'PENDENTE',
    codigo_totvs_pai: '10002', // Trying to overwrite parent
    porte: 'REGIONAL', // Physical field
  };

  console.log('Importing 10003 with modified physical fields and different parent...');
  await saveIgrejasBulk([import10003]);

  const c10003Updated = (await getIgrejas()).find(c => c.codigo_totvs === '10003')!;
  console.log('10003 Updated Parent:', c10003Updated.codigo_totvs_pai);
  console.log('10003 Updated Address:', c10003Updated.endereco);
  console.log('10003 Updated Bairro:', c10003Updated.bairro);
  console.log('10003 Updated Porte:', c10003Updated.porte);
  console.log('10003 Updated Coordinates:', c10003Updated.latitude, c10003Updated.longitude);
  console.log('10003 Updated Name (desc_igreja):', c10003Updated.desc_igreja);

  // Assertions for Case 2
  if (c10003Updated.codigo_totvs_pai !== '10001') {
    throw new Error(`FAIL: parent 'codigo_totvs_pai' was overwritten! Expected '10001', got '${c10003Updated.codigo_totvs_pai}'`);
  }
  if (c10003Updated.endereco !== 'Rua de Teste Modificada, 456') {
    throw new Error(`FAIL: Physical field 'endereco' should have been updated.`);
  }
  if (c10003Updated.bairro !== 'Bairro Teste Modificado') {
    throw new Error(`FAIL: Physical field 'bairro' should have been updated.`);
  }
  if (c10003Updated.porte !== 'REGIONAL') {
    throw new Error(`FAIL: Physical field 'porte' should have been updated.`);
  }
  // Check that non-physical fields were preserved
  if (c10003Updated.desc_igreja !== 'Central Teste 10003') {
    throw new Error(`FAIL: Non-physical field 'desc_igreja' should NOT have been updated. Expected 'Central Teste 10003', got '${c10003Updated.desc_igreja}'`);
  }
  if (c10003Updated.latitude !== -23 || c10003Updated.longitude !== -46) {
    throw new Error(`FAIL: Non-physical coordinates should NOT have been updated.`);
  }
  console.log('✅ PASS: Parent was preserved, physical fields updated, and non-physical fields preserved correctly.');

  console.log('\n--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
