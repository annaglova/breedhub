/**
 * BatchProcessor - Intelligent batching for large-scale config updates
 * 
 * Features:
 * - Deduplication of updates
 * - Configurable batch sizes
 * - Rate limiting
 * - Progress tracking
 * - Error handling with retry logic
 */

class BatchProcessor {
  constructor(supabase, options = {}) {
    this.supabase = supabase;
    this.batchSize = options.batchSize || 500;
    this.delayBetweenBatches = options.delayBetweenBatches || 100;
    this.maxRetries = options.maxRetries || 3;
    this.verbose = options.verbose || false;
    
    // Metrics
    this.metrics = {
      totalRecords: 0,
      processedRecords: 0,
      duplicatesRemoved: 0,
      batchesProcessed: 0,
      failedBatches: 0,
      startTime: null,
      endTime: null
    };
  }
  
  /**
   * Deduplicate records - keep only the latest version of each record
   */
  deduplicateRecords(records) {
    const uniqueMap = new Map();
    
    for (const record of records) {
      // If we already have this record, check which is newer
      if (uniqueMap.has(record.id)) {
        const existing = uniqueMap.get(record.id);
        // Keep the record with more complete data or latest in array
        if (Object.keys(record).length >= Object.keys(existing).length) {
          uniqueMap.set(record.id, record);
          this.metrics.duplicatesRemoved++;
        }
      } else {
        uniqueMap.set(record.id, record);
      }
    }
    
    return Array.from(uniqueMap.values());
  }
  
  /**
   * Split records into batches
   */
  createBatches(records) {
    const batches = [];
    for (let i = 0; i < records.length; i += this.batchSize) {
      batches.push(records.slice(i, i + this.batchSize));
    }
    return batches;
  }
  
  /**
   * Process a single batch with retry logic
   */
  async processBatch(batch, batchIndex, totalBatches) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        if (this.verbose) {
          console.log(`  Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} records)`);
        }
        
        // Use upsert for batch update
        const { data, error } = await this.supabase
          .from('app_config')
          .upsert(batch, {
            onConflict: 'id',
            returning: 'minimal'
          });
        
        if (error) throw error;
        
        this.metrics.processedRecords += batch.length;
        this.metrics.batchesProcessed++;
        
        return { success: true, processed: batch.length };
        
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          console.error(`  ❌ Batch ${batchIndex + 1} failed after ${this.maxRetries} retries:`, error.message);
          this.metrics.failedBatches++;
          return { success: false, error: error.message };
        }
        
        if (this.verbose) {
          console.log(`  ⚠️ Batch ${batchIndex + 1} failed, retry ${retries}/${this.maxRetries}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
  }
  
  /**
   * Main entry point - process all records
   */
  async processRecords(records, operation = 'Batch update') {
    console.log(`\n📦 ${operation}: Processing ${records.length} records`);
    
    // Start metrics
    this.metrics.startTime = Date.now();
    this.metrics.totalRecords = records.length;
    
    // Step 1: Deduplicate
    const uniqueRecords = this.deduplicateRecords(records);
    if (this.metrics.duplicatesRemoved > 0) {
      console.log(`  ✂️ Removed ${this.metrics.duplicatesRemoved} duplicate records`);
    }
    
    // Step 2: Create batches
    const batches = this.createBatches(uniqueRecords);
    console.log(`  📊 Split into ${batches.length} batches of up to ${this.batchSize} records`);
    
    // Step 3: Process batches
    const results = [];
    for (let i = 0; i < batches.length; i++) {
      const result = await this.processBatch(batches[i], i, batches.length);
      results.push(result);
      
      // Rate limiting between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }
    
    // End metrics
    this.metrics.endTime = Date.now();
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    
    // Summary
    console.log(`\n✅ Batch Processing Complete:`);
    console.log(`  - Processed: ${this.metrics.processedRecords}/${this.metrics.totalRecords} records`);
    console.log(`  - Batches: ${this.metrics.batchesProcessed} successful, ${this.metrics.failedBatches} failed`);
    console.log(`  - Duration: ${duration.toFixed(2)}s`);
    console.log(`  - Rate: ${(this.metrics.processedRecords / duration).toFixed(0)} records/sec`);
    
    return {
      success: this.metrics.failedBatches === 0,
      metrics: this.metrics,
      results
    };
  }
  
  /**
   * Optimized method for cascade updates
   */
  async processCascadeUpdate(changedIds, allConfigs) {
    console.log(`\n🔄 Cascade Update: Starting from ${changedIds.length} changed records`);
    
    // Build dependency graph
    const graph = this.buildDependencyGraph(allConfigs);
    
    // Find all affected records
    const affected = this.findAffectedRecords(changedIds, graph);
    console.log(`  📈 Found ${affected.size} affected records in dependency tree`);
    
    // Get records that need updating
    const recordsToUpdate = [];
    for (const configId of affected) {
      const config = allConfigs.find(c => c.id === configId);
      if (config && !changedIds.includes(configId)) {
        // Recalculate self_data and data
        const recalculated = this.recalculateConfig(config, allConfigs);
        if (recalculated) {
          recordsToUpdate.push(recalculated);
        }
      }
    }
    
    // Process updates in batches
    if (recordsToUpdate.length > 0) {
      return await this.processRecords(recordsToUpdate, 'Cascade update');
    }
    
    console.log('  ✨ No additional updates needed');
    return { success: true, metrics: this.metrics };
  }
  
  /**
   * Build reverse dependency graph
   */
  buildDependencyGraph(configs) {
    const graph = new Map();
    
    for (const config of configs) {
      if (config.deps && Array.isArray(config.deps)) {
        for (const dep of config.deps) {
          if (!graph.has(dep)) {
            graph.set(dep, []);
          }
          graph.get(dep).push(config.id);
        }
      }
    }
    
    return graph;
  }
  
  /**
   * Find all records affected by changes
   */
  findAffectedRecords(changedIds, graph) {
    const affected = new Set(changedIds);
    const queue = [...changedIds];
    
    while (queue.length > 0) {
      const current = queue.shift();
      const dependents = graph.get(current) || [];
      
      for (const dependent of dependents) {
        if (!affected.has(dependent)) {
          affected.add(dependent);
          queue.push(dependent);
        }
      }
    }
    
    return affected;
  }
  
  /**
   * Recalculate config's self_data and data
   */
  recalculateConfig(config, allConfigs) {
    try {
      // Build self_data from dependencies
      let newSelfData = {};
      
      if (config.deps && Array.isArray(config.deps)) {
        for (const depId of config.deps) {
          const depConfig = allConfigs.find(c => c.id === depId);
          if (depConfig && depConfig.data) {
            newSelfData = { ...newSelfData, ...depConfig.data };
          }
        }
      }
      
      // Calculate new data
      const newData = { ...newSelfData, ...(config.override_data || {}) };
      
      // Check if anything changed
      const selfDataChanged = JSON.stringify(config.self_data) !== JSON.stringify(newSelfData);
      const dataChanged = JSON.stringify(config.data) !== JSON.stringify(newData);
      
      if (selfDataChanged || dataChanged) {
        return {
          ...config,
          self_data: newSelfData,
          data: newData,
          updated_at: new Date().toISOString()
        };
      }
      
      return null; // No changes
    } catch (error) {
      console.error(`Error recalculating config ${config.id}:`, error);
      return null;
    }
  }
}

module.exports = BatchProcessor;