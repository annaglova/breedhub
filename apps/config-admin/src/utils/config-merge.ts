// Deep merge utility function
export function deepMerge(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  
  const result = { ...target };
  
  for (const source of sources) {
    if (!source) continue;
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

// Compute merged data for a config (simplified: self_data + override_data)
export async function computeMergedData(config: any): Promise<any> {
  // Start with self_data
  let merged = config.self_data || {};
  
  // Apply override_data on top
  if (config.override_data) {
    merged = deepMerge(merged, config.override_data);
  }
  
  return merged;
}