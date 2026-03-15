const { query, getClient } = require('../config/database');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  ERROR_MESSAGES, 
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  ACCOUNT_STATUS 
} = require('../utils/constants');
const { v4: uuidv4 } = require('crypto').randomUUID ? require('crypto') : require('uuid');

/**
 * Generate unique reference number
 */
const generateReferenceNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN${timestamp}${random}`;
};

/**
 * Get customer by account number
 */
const getCustomerByAccountNumber = async (accountNumber) => {
  const result = await query(
    'SELECT * FROM customers WHERE account_number = $1',
    [accountNumber]
  );

  if (result.rows.length === 0) {
    throw new AppError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  return result.rows[0];
};

/**
 * Validate account status
 */
const validateAccountStatus = (customer) => {
  if (customer.account_status !== ACCOUNT_STATUS.ACTIVE) {
    throw new AppError(
      `${ERROR_MESSAGES.ACCOUNT_INACTIVE}. Current status: ${customer.account_status}`,
      HTTP_STATUS.FORBIDDEN
    );
  }
};

/**
 * Create a transaction record
 */
const createTransaction = async (client, transactionData) => {
  const {
    customerId,
    transactionType,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    referenceNumber,
    status = TRANSACTION_STATUS.COMPLETED,
    metadata = {}
  } = transactionData;

  const result = await client.query(
    `INSERT INTO transactions 
      (customer_id, transaction_type, amount, balance_before, balance_after, 
       description, reference_number, status, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      customerId,
      transactionType,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      referenceNumber,
      status,
      JSON.stringify(metadata)
    ]
  );

  return result.rows[0];
};

/**
 * Update customer balance
 */
const updateCustomerBalance = async (client, customerId, newBalance) => {
  const result = await client.query(
    'UPDATE customers SET account_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [newBalance, customerId]
  );

  return result.rows[0];
};

/**
 * Process deposit or withdrawal transaction
 */
const processTransaction = async (accountNumber, transactionType, amount, description) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Get customer and lock the row
    const customerResult = await client.query(
      'SELECT * FROM customers WHERE account_number = $1 FOR UPDATE',
      [accountNumber]
    );

    if (customerResult.rows.length === 0) {
      throw new AppError(ERROR_MESSAGES.ACCOUNT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const customer = customerResult.rows[0];
    validateAccountStatus(customer);

    const currentBalance = parseFloat(customer.account_balance);
    let newBalance;

    // Calculate new balance based on transaction type
    if (transactionType === TRANSACTION_TYPES.DEPOSIT) {
      newBalance = currentBalance + amount;
    } else if (transactionType === TRANSACTION_TYPES.WITHDRAWAL) {
      if (currentBalance < amount) {
        throw new AppError(ERROR_MESSAGES.INSUFFICIENT_FUNDS, HTTP_STATUS.BAD_REQUEST);
      }
      newBalance = currentBalance - amount;
    } else {
      throw new AppError('Invalid transaction type', HTTP_STATUS.BAD_REQUEST);
    }

    // Update customer balance
    await updateCustomerBalance(client, customer.id, newBalance);

    // Create transaction record
    const referenceNumber = generateReferenceNumber();
    const transaction = await createTransaction(client, {
      customerId: customer.id,
      transactionType,
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: description || `${transactionType} transaction`,
      referenceNumber,
      metadata: {
        account_number: accountNumber,
        processed_at: new Date().toISOString()
      }
    });

    await client.query('COMMIT');

    logger.info('Transaction processed successfully', {
      reference: referenceNumber,
      type: transactionType,
      amount,
      account: accountNumber
    });

    return {
      transaction_id: transaction.id,
      reference_number: transaction.reference_number,
      account_number: accountNumber,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      transaction_type: transactionType,
      amount: parseFloat(amount).toFixed(2),
      balance_before: parseFloat(currentBalance).toFixed(2),
      balance_after: parseFloat(newBalance).toFixed(2),
      description: transaction.description,
      status: transaction.status,
      timestamp: transaction.created_at,
    };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed', {
      error: error.message,
      account: accountNumber,
      type: transactionType
    });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  processTransaction,
  getCustomerByAccountNumber,
  validateAccountStatus,
  createTransaction,
  updateCustomerBalance,
  generateReferenceNumber,
};