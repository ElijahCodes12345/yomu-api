class BaseDataProcessor {
  static sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  }

  static validateId(id) {
    if (!id || typeof id !== 'string') {
      return null;
    }
    return id.replace(/[^\w\-\/]/g, '');
  }

  static processCommonFields(data, fieldsConfig) {
    const processed = {};
    
    for (const [key, config] of Object.entries(fieldsConfig)) {
      const sourceKey = config.source || key;
      let value = data[sourceKey];
      
      if (config.processor) {
        value = config.processor(value);
      } else if (config.type === 'array') {
        value = Array.isArray(value) ? value : (value ? [value] : []);
        if (config.itemProcessor) {
          value = value.map(config.itemProcessor);
        }
      } else if (config.type === 'text') {
        value = this.sanitizeText(value);
      } else if (config.type === 'id') {
        value = this.validateId(value);
      }
      
      processed[key] = value !== undefined ? value : config.default || null;
    }
    
    return processed;
  }

  // Generic method to process lists
  static processList(items, processFunction) {
    if (!Array.isArray(items)) return [];
    return items.map(item => processFunction(item)).filter(item => item !== null);
  }
}

module.exports = BaseDataProcessor;