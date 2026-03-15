const { query } = require('../config/database');
const logger = require('../config/logger');
const { getCustomerByAccountNumber } = require('./transactionService');

/**
 * Get recent transactions for a customer
 */
const getRecentTransactions = async (customerId, limit = 5) => {
  const result = await query(
    `SELECT 
      id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      description,
      reference_number,
      status,
      created_at
    FROM transactions
    WHERE customer_id = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [customerId, limit]
  );

  return result.rows.map(txn => ({
    transaction_id: txn.id,
    type: txn.transaction_type,
    amount: parseFloat(txn.amount).toFixed(2),
    balance_before: parseFloat(txn.balance_before).toFixed(2),
    balance_after: parseFloat(txn.balance_after).toFixed(2),
    description: txn.description,
    reference: txn.reference_number,
    status: txn.status,
    date: txn.created_at,
  }));
};

/**
 * Get account balance and details
 */
const getAccountBalance = async (accountNumber) => {
  try {
    // Get customer details
    const customer = await getCustomerByAccountNumber(accountNumber);

    // Get recent transactions
    const recentTransactions = await getRecentTransactions(customer.id);

    // Get transaction summary
    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'transfer_in') THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN transaction_type IN ('withdrawal', 'transfer_out') THEN amount ELSE 0 END), 0) as total_debits
      FROM transactions
      WHERE customer_id = $1`,
      [customer.id]
    );

    const summary = summaryResult.rows[0];

    logger.info('Balance retrieved successfully', {
      account: accountNumber,
      balance: customer.account_balance,
    });

    return {
      account_details: {
        account_number: customer.account_number,
        account_holder: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        phone: customer.phone,
        account_status: customer.account_status,
        member_since: customer.created_at,
      },
      balance: {
        current_balance: parseFloat(customer.account_balance).toFixed(2),
        currency: 'KES',
        last_updated: customer.updated_at,
      },
      transaction_summary: {
        total_transactions: parseInt(summary.total_transactions),
        total_credits: parseFloat(summary.total_credits).toFixed(2),
        total_debits: parseFloat(summary.total_debits).toFixed(2),
        net_flow: parseFloat(summary.total_credits - summary.total_debits).toFixed(2),
      },
      recent_transactions: recentTransactions,
    };

  } catch (error) {
    logger.error('Failed to retrieve balance', {
      error: error.message,
      account: accountNumber,
    });
    throw error;
  }
};

module.exports = {
  getAccountBalance,
  getRecentTransactions,
};