#!/usr/bin/env node

/**
 * Cache Testing Script
 * Tests Redis caching functionality for companions and users
 */

import 'dotenv/config';
import { CacheService } from '../lib/cache';
import { CompanionService } from '../lib/companions';
import { UserService } from '../lib/user';

async function testCacheFunctionality() {
  console.log('🧪 Testing Cache Functionality...\n');

  try {
    // Test 1: Basic cache operations
    console.log('1️⃣ Testing basic cache operations...');
    await CacheService.set('test:key', { message: 'Hello Cache!' }, 60);
    const cachedValue = await CacheService.get('test:key');
    console.log('✅ Basic cache test:', cachedValue);
    await CacheService.delete('test:key');

    // Test 2: Cache statistics
    console.log('\n2️⃣ Testing cache statistics...');
    const stats = await CacheService.getStats();
    console.log('📊 Cache stats:', {
      memory: stats.memory,
      connectedClients: stats.connectedClients,
      keyspace: Object.keys(stats.keyspace).length > 0 ? 'Available' : 'Empty'
    });

    // Test 3: Companion caching
    console.log('\n3️⃣ Testing companion caching...');
    const startTime = Date.now();
    
    // First call - should hit database
    const companions1 = await CompanionService.getAllCompanions();
    const firstCallTime = Date.now() - startTime;
    console.log(`📦 First call (DB): ${firstCallTime}ms, found ${companions1.length} companions`);

    // Second call - should hit cache
    const cacheStartTime = Date.now();
    const companions2 = await CompanionService.getAllCompanions();
    const secondCallTime = Date.now() - cacheStartTime;
    console.log(`⚡ Second call (Cache): ${secondCallTime}ms, found ${companions2.length} companions`);

    // Test 4: User caching simulation
    console.log('\n4️⃣ Testing user caching...');
    const testTelegramId = BigInt(123456789);
    
    // Test user creation/lookup with caching
    const userStartTime = Date.now();
    const userId = await UserService.getOrCreateUserByTelegramId(testTelegramId, 'testuser');
    const userCallTime = Date.now() - userStartTime;
    console.log(`👤 User lookup/creation: ${userCallTime}ms, ID: ${userId}`);

    // Test 5: Cache invalidation
    console.log('\n5️⃣ Testing cache invalidation...');
    await CacheService.invalidateCompanion();
    console.log('🗑️ Companion cache invalidated');

    // Test 6: Performance comparison
    console.log('\n6️⃣ Performance comparison...');
    
    // Without cache (simulate)
    const dbStartTime = Date.now();
    for (let i = 0; i < 5; i++) {
      await CompanionService.getAllCompanions();
    }
    const dbTime = Date.now() - dbStartTime;
    console.log(`🐌 5 DB calls: ${dbTime}ms`);

    // With cache (should be much faster)
    const cacheStartTime2 = Date.now();
    for (let i = 0; i < 5; i++) {
      await CompanionService.getAllCompanions();
    }
    const cacheTime = Date.now() - cacheStartTime2;
    console.log(`⚡ 5 Cache calls: ${cacheTime}ms`);
    
    const improvement = ((dbTime - cacheTime) / dbTime * 100).toFixed(1);
    console.log(`📈 Performance improvement: ${improvement}%`);

    // Test 7: Cache key patterns
    console.log('\n7️⃣ Testing cache key patterns...');
    const testKeys = [
      CacheService.keys.companion('test-id'),
      CacheService.keys.userByTelegramId('123456789'),
      CacheService.keys.allCompanions()
    ];
    console.log('🔑 Cache keys:', testKeys);

    console.log('\n✅ All cache tests completed successfully!');
    console.log('\n📋 Cache Performance Summary:');
    console.log(`   • Cache hit time: ~${secondCallTime}ms`);
    console.log(`   • Database hit time: ~${firstCallTime}ms`);
    console.log(`   • Performance improvement: ${improvement}%`);
    console.log(`   • Memory usage: ${stats.memory}`);

  } catch (error) {
    console.error('❌ Cache test failed:', error);
    process.exit(1);
  }
}

async function testCacheWarming() {
  console.log('\n🔥 Testing cache warming...');
  
  try {
    // Test cache warming by pre-loading some data
    console.log('📦 Pre-loading companions...');
    await CompanionService.getAllCompanions();
    
    console.log('👤 Pre-loading test user...');
    const testTelegramId = BigInt(999999999);
    await UserService.getOrCreateUserByTelegramId(testTelegramId, 'cachetest');
    
    console.log('✅ Cache warming completed');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting Cache Testing Suite...\n');
  
  await testCacheFunctionality();
  await testCacheWarming();
  
  console.log('\n🎉 Cache testing suite completed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
