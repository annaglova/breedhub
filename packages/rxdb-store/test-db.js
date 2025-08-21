#!/usr/bin/env node

// Simple test to verify RxDB database initialization works
const { databaseService } = require('./dist/index.js');

async function testDatabase() {
  try {
    console.log('Testing RxDB database initialization...');
    const db = await databaseService.getDatabase();
    console.log('✅ Database initialized successfully!');
    console.log('Collections:', Object.keys(db.collections));
    
    // Try to insert a breed
    const testBreed = {
      id: 'test-' + Date.now(),
      name: 'Test Breed',
      description: 'A test breed',
      size: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _deleted: false
    };
    
    const doc = await db.breeds.insert(testBreed);
    console.log('✅ Successfully inserted breed:', doc.name);
    
    // Query breeds
    const breeds = await db.breeds.find().exec();
    console.log('✅ Found', breeds.length, 'breeds in database');
    
    // Clean up
    await doc.remove();
    console.log('✅ Cleaned up test data');
    
    await databaseService.closeDatabase();
    console.log('✅ Database closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();