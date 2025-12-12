import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Form field wrapper with validation display
 */
export function FormField({ 
  label, 
  error, 
  success,
  required = false,
  children,
  hint
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-1 text-sm text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}
      {hint && !error && !success && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

/**
 * Validation utilities
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
      return "Please enter a valid email address";
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phoneRegex.test(value)) {
      return "Please enter a valid phone number";
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

  number: (value) => {
    if (!value) return null;
    if (isNaN(value)) {
      return "Please enter a valid number";
    }
    return null;
  },

  min: (min) => (value) => {
    if (!value) return null;
    if (parseFloat(value) < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },

  max: (max) => (value) => {
    if (!value) return null;
    if (parseFloat(value) > max) {
      return `Must be no more than ${max}`;
    }
    return null;
  },

  custom: (validatorFn, errorMessage) => (value) => {
    if (!validatorFn(value)) {
      return errorMessage;
    }
    return null;
  }
};

/**
 * useFormValidation hook
 */
export function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const validateField = (name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      const error = rule(value);
      if (error) return error;
    }
    return null;
  };

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate on change if field was touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid: Object.keys(errors).every(key => !errors[key])
  };
}