const fs = require("fs");
const path = require("path");
const entityCategories = require('./entity-categories.json');

// Directories to scan
const ENTITY_DIR = path.join(__dirname, '../src/data/entities');
const OUTPUT_DIR = path.join(__dirname, '../src/data/semantic-tree');

// Create output directory if not exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load all entity JSON files
function loadAllEntities() {
  const entities = [];
  const categories = ['main', 'lookup', 'child'];
  
  for (const category of categories) {
    const categoryPath = path.join(ENTITY_DIR, category);
    if (!fs.existsSync(categoryPath)) continue;
    
    const files = fs.readdirSync(categoryPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(categoryPath, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      entities.push({
        category,
        tableName: content.name,
        fields: content.fields,
        metadata: content.metadata
      });
    }
  }
  
  return entities;
}

// Analyze field frequency and patterns
function analyzeFields(entities) {
  const fieldMap = new Map();
  const fieldUsageByEntity = new Map();
  
  for (const entity of entities) {
    for (const field of entity.fields) {
      const fieldKey = field.name;
      
      // Track field usage
      if (!fieldMap.has(fieldKey)) {
        fieldMap.set(fieldKey, {
          name: fieldKey,
          occurrences: 0,
          entities: [],
          variations: [],
          commonProps: null
        });
      }
      
      const fieldInfo = fieldMap.get(fieldKey);
      fieldInfo.occurrences++;
      fieldInfo.entities.push(entity.tableName);
      fieldInfo.variations.push({
        entity: entity.tableName,
        category: entity.category,
        config: field
      });
      
      // Track entity-field relationship
      const entityFieldKey = `${entity.tableName}_field_${fieldKey}`;
      fieldUsageByEntity.set(entityFieldKey, {
        entity: entity.tableName,
        category: entity.category,
        field: field
      });
    }
  }
  
  // Identify common properties for each field
  for (const [fieldKey, fieldInfo] of fieldMap) {
    if (fieldInfo.occurrences > 1) {
      fieldInfo.commonProps = extractCommonProperties(fieldInfo.variations);
    }
  }
  
  return { fieldMap, fieldUsageByEntity, totalEntities: entities.length };
}

// Extract common properties from field variations
function extractCommonProperties(variations) {
  if (variations.length === 0) return {};
  
  const firstConfig = variations[0].config;
  const commonProps = {};
  
  // Check which properties are common across all variations
  const propsToCheck = [
    'fieldType', 'component', 'required', 'isSystem', 
    'isPrimaryKey', 'isUnique', 'displayName', 'permissions'
  ];
  
  for (const prop of propsToCheck) {
    const firstValue = JSON.stringify(firstConfig[prop]);
    const isCommon = variations.every(v => 
      JSON.stringify(v.config[prop]) === firstValue
    );
    
    if (isCommon && firstConfig[prop] !== undefined) {
      commonProps[prop] = firstConfig[prop];
    }
  }
  
  // Check validation rules
  if (firstConfig.validation) {
    const firstValidation = JSON.stringify(firstConfig.validation);
    const hasCommonValidation = variations.every(v =>
      JSON.stringify(v.config.validation) === firstValidation
    );
    
    if (hasCommonValidation) {
      commonProps.validation = firstConfig.validation;
    }
  }
  
  // Check maxLength variations
  const maxLengths = variations
    .map(v => v.config.maxLength)
    .filter(ml => ml !== undefined);
  
  if (maxLengths.length > 0) {
    commonProps.maxLengthVariations = [...new Set(maxLengths)];
  }
  
  return commonProps;
}

// Generate base field definitions
function generateBaseFields(fieldMap, threshold = 0.1) {
  const baseFields = [];
  const totalEntities = 258; // We know we have 258 entities
  
  for (const [fieldKey, fieldInfo] of fieldMap) {
    const frequency = fieldInfo.occurrences / totalEntities;
    
    // Include fields that appear in more than threshold of entities
    if (frequency >= threshold) {
      baseFields.push({
        id: `field_${fieldKey}`,
        type: 'field',
        name: fieldKey,
        frequency: frequency,
        occurrences: fieldInfo.occurrences,
        commonProps: fieldInfo.commonProps,
        isSystem: fieldInfo.commonProps?.isSystem === true,
        category: frequency > 0.8 ? 'base' : frequency > 0.4 ? 'common' : 'frequent'
      });
    }
  }
  
  // Sort by frequency
  baseFields.sort((a, b) => b.frequency - a.frequency);
  
  return baseFields;
}

// Generate field properties (atomic units)
function generateFieldProperties(fieldMap) {
  const properties = new Map();
  
  // NO DEFAULTS - each field explicitly declares all its properties
  
  // Extract unique properties
  for (const [fieldKey, fieldInfo] of fieldMap) {
    for (const variation of fieldInfo.variations) {
      const config = variation.config;
      
      // Required property
      if (config.required === true) {
        properties.set('property_required', {
          id: 'property_required',
          type: 'property',
          self_data: {
            required: true,
            validation: { notNull: true }
          }
        });
      }
      
      // Not required property (explicit false)
      if (config.required === false) {
        properties.set('property_not_required', {
          id: 'property_not_required',
          type: 'property',
          self_data: {
            required: false
          }
        });
      }
      
      // ReadOnly property (for system fields)
      if (config.isSystem === true) {
        properties.set('property_readonly', {
          id: 'property_readonly',
          type: 'property',
          self_data: {
            permissions: { write: ['system'] }
          }
        });
      }
      
      // isSystem property true
      if (config.isSystem === true) {
        properties.set('property_is_system', {
          id: 'property_is_system',
          type: 'property',
          self_data: {
            isSystem: true
          }
        });
      }
      
      // isSystem property false (explicit)
      if (config.isSystem === false) {
        properties.set('property_not_system', {
          id: 'property_not_system',
          type: 'property',
          self_data: {
            isSystem: false
          }
        });
      }
      
      // MaxLength properties
      if (config.maxLength) {
        const propId = `property_maxlength_${config.maxLength}`;
        if (!properties.has(propId)) {
          properties.set(propId, {
            id: propId,
            type: 'property',
            self_data: {
              maxLength: config.maxLength,
              validation: { maxLength: config.maxLength }
            }
          });
        }
      }
      
      // Primary key property
      if (config.isPrimaryKey === true) {
        properties.set('property_primary_key', {
          id: 'property_primary_key',
          type: 'property',
          self_data: {
            isPrimaryKey: true,
            isUnique: true
          }
        });
      }
      
      // Not primary key property (explicit)
      if (config.isPrimaryKey === false) {
        properties.set('property_not_primary_key', {
          id: 'property_not_primary_key',
          type: 'property',
          self_data: {
            isPrimaryKey: false
          }
        });
      }
      
      // Unique property
      if (config.isUnique === true && !config.isPrimaryKey) {
        properties.set('property_unique', {
          id: 'property_unique',
          type: 'property',
          self_data: {
            isUnique: true
          }
        });
      }
      
      // Not unique property (explicit)
      if (config.isUnique === false) {
        properties.set('property_not_unique', {
          id: 'property_not_unique',
          type: 'property',
          self_data: {
            isUnique: false
          }
        });
      }
    }
  }
  
  return Array.from(properties.values());
}

// Build semantic tree structure
function buildSemanticTree(fieldMap, fieldUsageByEntity) {
  const tree = {
    properties: generateFieldProperties(fieldMap),
    baseFields: generateBaseFields(fieldMap),
    entityFields: []
  };
  
  // Generate entity-specific fields for ALL entities
  // const testEntities = ['breed']; // REMOVED - processing all entities now
  
  for (const [key, usage] of fieldUsageByEntity) {
    // Process ALL entities, no filtering
    
    const fieldName = usage.field.name;
    const baseFieldId = `field_${fieldName}`;
    const baseField = tree.baseFields.find(f => f.id === baseFieldId);
    
    // Determine entity tags
    const entityTags = [];
    const entityName = usage.entity;
    
    // Check if it's a main entity
    if (entityCategories.main.includes(entityName)) {
      entityTags.push('main', entityName);
    }
    // Check if it's a child entity
    else {
      let isChild = false;
      for (const [parent, children] of Object.entries(entityCategories.child)) {
        if (children.includes(entityName)) {
          entityTags.push('child', parent);
          isChild = true;
          break;
        }
      }
      // Check if it's a dictionary
      if (!isChild && entityCategories.dictionaries.includes(entityName)) {
        entityTags.push('dictionary');
      }
    }
    
    const entityField = {
      id: `${usage.entity}_field_${fieldName}`,
      type: 'entity_field',
      deps: [],
      category: usage.entity,
      caption: `${usage.entity} ${fieldName} field`,
      self_data: {},
      tags: entityTags
    };
    
    // If there's a matching base field, inherit from it
    if (baseField) {
      entityField.deps.push(baseFieldId);
      
      // Copy ALL data from the entity's field config to self_data
      // This includes inherited data from base field
      entityField.self_data = { ...usage.field };
      delete entityField.self_data.id; // Remove field-specific id
      delete entityField.self_data.name; // Name is already in the key
    } else {
      // No base field, include full config in self_data
      entityField.self_data = { ...usage.field };
      delete entityField.self_data.id; // Remove field-specific id
      delete entityField.self_data.name; // Name is already in the key
      
      // Add explicit property dependencies
      if (usage.field.required === true) {
        entityField.deps.push('property_required');
      } else if (usage.field.required === false) {
        entityField.deps.push('property_not_required');
      }
      
      if (usage.field.isSystem === true) {
        entityField.deps.push('property_readonly');
        entityField.deps.push('property_is_system');
      } else if (usage.field.isSystem === false) {
        entityField.deps.push('property_not_system');
      }
      
      if (usage.field.isPrimaryKey === true) {
        entityField.deps.push('property_primary_key');
      } else if (usage.field.isPrimaryKey === false) {
        entityField.deps.push('property_not_primary_key');
      }
      
      if (usage.field.isUnique === true && !usage.field.isPrimaryKey) {
        entityField.deps.push('property_unique');
      } else if (usage.field.isUnique === false) {
        entityField.deps.push('property_not_unique');
      }
      
      if (usage.field.maxLength) {
        entityField.deps.push(`property_maxlength_${usage.field.maxLength}`);
      }
    }
    
    tree.entityFields.push(entityField);
  }
  
  return tree;
}

// Generate analysis report
function generateReport(analysis, tree) {
  const report = {
    summary: {
      totalEntities: analysis.totalEntities,
      uniqueFields: analysis.fieldMap.size,
      baseFields: tree.baseFields.length,
      properties: tree.properties.length,
      entityFieldsGenerated: tree.entityFields.length
    },
    topFields: [],
    systemFields: [],
    commonFields: [],
    analysis: {}
  };
  
  // Get top 20 most common fields
  const sortedFields = Array.from(analysis.fieldMap.values())
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 20);
  
  report.topFields = sortedFields.map(f => ({
    name: f.name,
    occurrences: f.occurrences,
    percentage: ((f.occurrences / analysis.totalEntities) * 100).toFixed(1) + '%'
  }));
  
  // Categorize fields
  report.systemFields = tree.baseFields
    .filter(f => f.category === 'base')
    .map(f => f.name);
  
  report.commonFields = tree.baseFields
    .filter(f => f.category === 'common')
    .map(f => f.name);
  
  // Field type analysis
  const fieldTypes = new Map();
  for (const [_, fieldInfo] of analysis.fieldMap) {
    const type = fieldInfo.commonProps?.fieldType || 'unknown';
    fieldTypes.set(type, (fieldTypes.get(type) || 0) + 1);
  }
  
  report.analysis.fieldTypes = Object.fromEntries(fieldTypes);
  
  return report;
}

// Main execution
function main() {
  console.log('Loading entity configurations...');
  const entities = loadAllEntities();
  console.log(`Loaded ${entities.length} entity configurations`);
  
  console.log('\nAnalyzing field patterns...');
  const analysis = analyzeFields(entities);
  console.log(`Found ${analysis.fieldMap.size} unique fields`);
  
  console.log('\nBuilding semantic tree...');
  const tree = buildSemanticTree(analysis.fieldMap, analysis.fieldUsageByEntity);
  
  console.log('\nGenerating report...');
  const report = generateReport(analysis, tree);
  
  // Save outputs
  const outputs = {
    'field-analysis.json': analysis.fieldMap,
    'semantic-tree.json': tree,
    'analysis-report.json': report
  };
  
  for (const [filename, data] of Object.entries(outputs)) {
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    // Convert Map to array for JSON serialization
    const dataToSave = data instanceof Map ? 
      Array.from(data.entries()).map(([key, value]) => ({ key, ...value })) : 
      data;
    
    fs.writeFileSync(outputPath, JSON.stringify(dataToSave, null, 2));
    console.log(`✅ Saved: ${outputPath}`);
  }
  
  // Print summary
  console.log('\n=== Analysis Summary ===');
  console.log(`Total Entities: ${report.summary.totalEntities}`);
  console.log(`Unique Fields: ${report.summary.uniqueFields}`);
  console.log(`Base Fields Generated: ${report.summary.baseFields}`);
  console.log(`Field Properties: ${report.summary.properties}`);
  console.log(`Entity Fields (all entities): ${report.summary.entityFieldsGenerated}`);
  
  console.log('\n=== Top 10 Most Common Fields ===');
  report.topFields.slice(0, 10).forEach(f => {
    console.log(`  ${f.name}: ${f.occurrences} occurrences (${f.percentage})`);
  });
  
  console.log('\n=== System Fields (>80% occurrence) ===');
  console.log(report.systemFields.join(', '));
  
  console.log('\n=== Common Fields (>40% occurrence) ===');
  console.log(report.commonFields.join(', '));
}

// Run analyzer
main();