/**
 * Shared form validation utilities
 */

export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return "This field is required";
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Invalid email address";
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return "Invalid phone number";
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  numeric: (value) => {
    if (!value) return null;
    if (isNaN(value)) {
      return "Must be a number";
    }
    return null;
  },

  positiveNumber: (value) => {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return "Must be a positive number";
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return "Invalid URL";
    }
  },

  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return null;
  },
};

/**
 * Run multiple validators on a value
 */
export const validate = (value, validatorFns) => {
  for (const fn of validatorFns) {
    const error = fn(value);
    if (error) return error;
  }
  return null;
};

/**
 * Validate an entire form object
 */
export const validateForm = (formData, schema) => {
  const errors = {};
  let hasErrors = false;

  Object.keys(schema).forEach(field => {
    const error = validate(formData[field], schema[field]);
    if (error) {
      errors[field] = error;
      hasErrors = true;
    }
  });

  return { errors, hasErrors };
};