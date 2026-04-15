import ApiError from '../utils/ApiError.js';

/**
 * Factory that returns an Express middleware to validate req.body
 * against a schema object.
 *
 * Schema format:
 * {
 *   fieldName: {
 *     required: true,
 *     type: 'string',        // 'string' | 'number' | 'boolean'
 *     min: 1,                // min length (string) or min value (number)
 *     max: 100,              // max length (string) or max value (number)
 *     enum: ['a', 'b'],      // allowed values
 *     custom: (val) => true, // custom validator, return false to fail
 *     customMsg: 'Invalid',  // message when custom fails
 *   }
 * }
 */
export function validate(schema) {
  return (req, _res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required.`);
        continue;
      }

      // Skip further checks if optional and not provided
      if (value === undefined || value === null) continue;

      // Type check
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}.`);
        continue;
      }

      // String length / Number range
      if (rules.type === 'string') {
        if (rules.min !== undefined && value.length < rules.min) {
          errors.push(`${field} must be at least ${rules.min} characters.`);
        }
        if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`${field} must be at most ${rules.max} characters.`);
        }
      }

      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}.`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}.`);
        }
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}.`);
      }

      // Custom validator
      if (rules.custom && !rules.custom(value)) {
        errors.push(rules.customMsg || `${field} is invalid.`);
      }
    }

    if (errors.length > 0) {
      throw ApiError.badRequest('Validation failed.', errors);
    }

    next();
  };
}
