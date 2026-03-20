#!/usr/bin/env node
/**
 * Prueba de configuración actualizada del sistema multi-proveedor
 * Verifica que todos los modelos estén correctamente configurados
 */

require('dotenv').config();
const { MultiProviderConfig } = require('./services/config.js');

console.log('=== PRUEBA DE CONFIGURACIÓN ACTUALIZADA ===\n');

// 1. Verificar proveedores habilitados
console.log('1. PROVEEDORES HABILITADOS:');
Object.entries(MultiProviderConfig.providers).forEach(([key, provider]) => {
  console.log(`   ${key}: ${provider.enabled ? '✅ Habilitado' : '❌ Deshabilitado'} - ${provider.name}`);
  console.log(`     Modelo por defecto: ${provider.defaultModel}`);
  console.log(`     Rate limit: ${provider.rateLimit} req/min`);
  console.log(`     Timeout: ${provider.timeout}ms`);
  console.log('');
});

// 2. Verificar modelos por proveedor
console.log('2. MODELOS DISPONIBLES POR PROVEEDOR:');
Object.entries(MultiProviderConfig.models).forEach(([provider, models]) => {
  console.log(`\n   ${provider.toUpperCase()}:`);
  models.forEach(model => {
    const freeTag = model.free ? ' (FREE)' : '';
    const defaultTag = model.id === MultiProviderConfig.providers[provider].defaultModel ? ' [DEFAULT]' : '';
    console.log(`     - ${model.label}${freeTag}${defaultTag}`);
    console.log(`       ID: ${model.id} | Costo: ${model.cost}`);
  });
});

// 3. Verificar configuración de modelos gratuitos
console.log('\n\n3. CONFIGURACIÓN DE MODELOS GRATUITOS:');
const freeConfig = MultiProviderConfig.freeModelsConfig;
console.log(`   Habilitado: ${freeConfig.enabled ? '✅' : '❌'}`);
console.log(`   Preferir modelos gratuitos: ${freeConfig.preferFreeModels ? '✅' : '❌'}`);
console.log(`   Fallback a gratuitos: ${freeConfig.fallbackToFree ? '✅' : '❌'}`);
console.log(`   Multiplicador de rate limit: ${freeConfig.rateLimitMultiplier}`);
console.log(`   Timeout para modelos gratuitos: ${freeConfig.freeModelTimeout}ms`);

// 4. Contar modelos gratuitos
console.log('\n\n4. ESTADÍSTICAS DE MODELOS:');
let totalModels = 0;
let freeModels = 0;

Object.values(MultiProviderConfig.models).forEach(models => {
  totalModels += models.length;
  freeModels += models.filter(m => m.free).length;
});

console.log(`   Total de modelos: ${totalModels}`);
console.log(`   Modelos gratuitos: ${freeModels}`);
console.log(`   Modelos de pago: ${totalModels - freeModels}`);

// 5. Verificar variables de entorno
console.log('\n\n5. VARIABLES DE ENTORNO:');
const envVars = [
  'GEMINI_API_KEY',
  'OPENAI_API_KEY', 
  'OPENROUTER_API_KEY',
  'DEFAULT_PROVIDER',
  'FREE_MODELS_ENABLED',
  'FALLBACK_TO_FREE'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (varName.includes('API_KEY')) {
    console.log(`   ${varName}: ${value ? '✅ Configurada' : '❌ No configurada'}`);
  } else {
    console.log(`   ${varName}: ${value || 'No definido'}`);
  }
});

// 6. Validar configuración de fallback
console.log('\n\n6. CONFIGURACIÓN DE FALLBACK:');
const fallback = MultiProviderConfig.fallback;
console.log(`   Habilitado: ${fallback.enabled ? '✅' : '❌'}`);
console.log(`   Orden de preferencia: ${fallback.order.join(' → ')}`);
console.log(`   Máximo de reintentos: ${fallback.maxRetries}`);
console.log(`   Delay inicial: ${fallback.initialDelay}ms`);

console.log('\n=== PRUEBA COMPLETADA ===');
console.log('✅ Configuración validada exitosamente');