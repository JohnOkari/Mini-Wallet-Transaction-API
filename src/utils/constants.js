// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

// Transaction Types
const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
};

// Transaction Status
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REVERSED: 'reversed',
};

// Account Status
const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

// Error Messages
const ERROR_MESSAGES = {
  CUSTOMER_NOT_FOUND: 'Customer not found',
  ACCOUNT_NOT_FOUND: 'Account not found',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this transaction',
  INVALID_AMOUNT: 'Invalid transaction amount',
  INVALID_ACCOUNT: 'Invalid account number',
  SAME_ACCOUNT_TRANSFER: 'Cannot transfer to the same account',
  ACCOUNT_INACTIVE: 'Account is not active',
  TRANSACTION_FAILED: 'Transaction failed',
  DATABASE_ERROR: 'Database operation failed',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
};

// Success Messages
const SUCCESS_MESSAGES = {
  TRANSACTION_CREATED: 'Transaction created successfully',
  TRANSFER_COMPLETED: 'Transfer completed successfully',
  BALANCE_RETRIEVED: 'Balance retrieved successfully',
};

// Validation Constants
const VALIDATION = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 10000000,
  ACCOUNT_NUMBER_LENGTH: 14,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

module.exports = {
  HTTP_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  ACCOUNT_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
};