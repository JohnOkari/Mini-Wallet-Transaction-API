const Joi = require('joi');
const { validationErrorResponse } = require('../utils/responses');
const { VALIDATION } = require('../utils/constants');

/**
 * Validation schemas
 */
const schemas = {
  // Create transaction schema
  createTransaction: Joi.object({
    account_number: Joi.string()
      .length(VALIDATION.ACCOUNT_NUMBER_LENGTH)
      .required()
      .messages({
        'string.length': `Account number must be ${VALIDATION.ACCOUNT_NUMBER_LENGTH} characters`,
        'any.required': 'Account number is required',
      }),
    transaction_type: Joi.string()
      .valid('deposit', 'withdrawal')
      .required()
      .messages({
        'any.only': 'Transaction type must be either deposit or withdrawal',
        'any.required': 'Transaction type is required',
      }),
    amount: Joi.number()
      .positive()
      .min(VALIDATION.MIN_AMOUNT)
      .max(VALIDATION.MAX_AMOUNT)
      .precision(2)
      .required()
      .messages({
        'number.positive': 'Amount must be a positive number',
        'number.min': `Amount must be at least ${VALIDATION.MIN_AMOUNT}`,
        'number.max': `Amount cannot exceed ${VALIDATION.MAX_AMOUNT}`,
        'any.required': 'Amount is required',
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters',
      }),
  }),

  // Fund transfer schema
  fundTransfer: Joi.object({
    sender_account: Joi.string()
      .length(VALIDATION.ACCOUNT_NUMBER_LENGTH)
      .required()
      .messages({
        'string.length': `Sender account number must be ${VALIDATION.ACCOUNT_NUMBER_LENGTH} characters`,
        'any.required': 'Sender account number is required',
      }),
    receiver_account: Joi.string()
      .length(VALIDATION.ACCOUNT_NUMBER_LENGTH)
      .required()
      .invalid(Joi.ref('sender_account'))
      .messages({
        'string.length': `Receiver account number must be ${VALIDATION.ACCOUNT_NUMBER_LENGTH} characters`,
        'any.required': 'Receiver account number is required',
        'any.invalid': 'Sender and receiver accounts must be different',
      }),
    amount: Joi.number()
      .positive()
      .min(VALIDATION.MIN_AMOUNT)
      .max(VALIDATION.MAX_AMOUNT)
      .precision(2)
      .required()
      .messages({
        'number.positive': 'Amount must be a positive number',
        'number.min': `Amount must be at least ${VALIDATION.MIN_AMOUNT}`,
        'number.max': `Amount cannot exceed ${VALIDATION.MAX_AMOUNT}`,
        'any.required': 'Amount is required',
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters',
      }),
  }),

  // Get balance schema
  getBalance: Joi.object({
    account_number: Joi.string()
      .length(VALIDATION.ACCOUNT_NUMBER_LENGTH)
      .required()
      .messages({
        'string.length': `Account number must be ${VALIDATION.ACCOUNT_NUMBER_LENGTH} characters`,
        'any.required': 'Account number is required',
      }),
  }),
};

/**
 * Validation middleware factory
 */
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return next(new Error(`Validation schema '${schemaName}' not found`));
    }

    // Determine which data to validate (body, query, or params)
    let dataToValidate = req.body;
    if (schemaName === 'getBalance' && req.params.account_number) {
      dataToValidate = { account_number: req.params.account_number };
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return validationErrorResponse(res, error.details);
    }

    // Replace request data with validated and sanitized data
    if (schemaName === 'getBalance' && req.params.account_number) {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  validate,
  schemas,
};