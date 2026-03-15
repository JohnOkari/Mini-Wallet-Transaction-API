const { query, getClient } = require('../config/database');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
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
  if (customer.account_status !== 'active') {
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
 * Create transfer record
 */
const createTransferRecord = async (client, transferData) => {
  const {
    senderId,
    receiverId,
    amount,
    senderTransactionId,
    receiverTransactionId,
    transferReference,
    description,
    status = 'completed'
  } = transferData;

  const result = await client.query(
    `INSERT INTO transfers
      (sender_id, receiver_id, amount, sender_transaction_id, receiver_transaction_id,
       transfer_reference, description, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      senderId,
      receiverId,
      amount,
      senderTransactionId,
      receiverTransactionId,
      transferReference,
      description,
      status
    ]
  );

  return result.rows[0];
};

/**
 * Generate unique transfer reference number
 */
const generateTransferReference = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TRF${timestamp}${random}`;
};

/**
 * Process fund transfer between accounts
 */
const processTransfer = async (senderAccount, receiverAccount, amount, description) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get and lock sender account
    const senderResult = await client.query(
      'SELECT * FROM customers WHERE account_number = $1 FOR UPDATE',
      [senderAccount]
    );

    if (senderResult.rows.length === 0) {
      throw new AppError('Sender account not found', HTTP_STATUS.NOT_FOUND);
    }

    const sender = senderResult.rows[0];
    validateAccountStatus(sender);

    // Get and lock receiver account
    const receiverResult = await client.query(
      'SELECT * FROM customers WHERE account_number = $1 FOR UPDATE',
      [receiverAccount]
    );

    if (receiverResult.rows.length === 0) {
      throw new AppError('Receiver account not found', HTTP_STATUS.NOT_FOUND);
    }

    const receiver = receiverResult.rows[0];
    validateAccountStatus(receiver);

    // Check sender balance
    const senderBalance = parseFloat(sender.account_balance);
    if (senderBalance < amount) {
      throw new AppError(ERROR_MESSAGES.INSUFFICIENT_FUNDS, HTTP_STATUS.BAD_REQUEST);
    }

    // Calculate new balances
    const newSenderBalance = senderBalance - amount;
    const receiverBalance = parseFloat(receiver.account_balance);
    const newReceiverBalance = receiverBalance + amount;

    // Update balances
    await updateCustomerBalance(client, sender.id, newSenderBalance);
    await updateCustomerBalance(client, receiver.id, newReceiverBalance);

    // Generate transfer reference
    const transferReference = generateTransferReference();

    // Create transactions
    const senderTransaction = await createTransaction(client, {
      customerId: sender.id,
      transactionType: TRANSACTION_TYPES.TRANSFER_OUT,
      amount,
      balanceBefore: senderBalance,
      balanceAfter: newSenderBalance,
      description: description || `Transfer to ${receiverAccount}`,
      referenceNumber: generateReferenceNumber(),
      metadata: {
        sender_account: senderAccount,
        receiver_account: receiverAccount,
        transfer_reference: transferReference,
        processed_at: new Date().toISOString()
      }
    });

    const receiverTransaction = await createTransaction(client, {
      customerId: receiver.id,
      transactionType: TRANSACTION_TYPES.TRANSFER_IN,
      amount,
      balanceBefore: receiverBalance,
      balanceAfter: newReceiverBalance,
      description: description || `Transfer from ${senderAccount}`,
      referenceNumber: generateReferenceNumber(),
      metadata: {
        sender_account: senderAccount,
        receiver_account: receiverAccount,
        transfer_reference: transferReference,
        processed_at: new Date().toISOString()
      }
    });

    // Create transfer record
    const transfer = await createTransferRecord(client, {
      senderId: sender.id,
      receiverId: receiver.id,
      amount,
      senderTransactionId: senderTransaction.id,
      receiverTransactionId: receiverTransaction.id,
      transferReference,
      description: description || 'Fund transfer',
      status: 'completed'
    });

    await client.query('COMMIT');

    logger.info('Transfer processed successfully', {
      transferReference,
      sender: senderAccount,
      receiver: receiverAccount,
      amount
    });

    return {
      transfer_id: transfer.id,
      transfer_reference: transferReference,
      sender_account: senderAccount,
      sender_name: `${sender.first_name} ${sender.last_name}`,
      receiver_account: receiverAccount,
      receiver_name: `${receiver.first_name} ${receiver.last_name}`,
      amount: parseFloat(amount).toFixed(2),
      sender_balance_before: parseFloat(senderBalance).toFixed(2),
      sender_balance_after: parseFloat(newSenderBalance).toFixed(2),
      receiver_balance_before: parseFloat(receiverBalance).toFixed(2),
      receiver_balance_after: parseFloat(newReceiverBalance).toFixed(2),
      description: transfer.description,
      status: transfer.status,
      timestamp: transfer.created_at,
    };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transfer failed', {
      error: error.message,
      sender: senderAccount,
      receiver: receiverAccount,
      amount
    });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  processTransfer,
  getCustomerByAccountNumber,
  validateAccountStatus,
  createTransaction,
  updateCustomerBalance,
  createTransferRecord,
  generateTransferReference,
};