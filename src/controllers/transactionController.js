const { processTransaction } = require('../services/transactionService');
const { successResponse } = require('../utils/responses');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const logger = require('../config/logger');

/**
 * Create a new transaction (deposit or withdrawal)
 * POST /api/transactions
 */
const createTransaction = async (req, res, next) => {
  try {
    const { account_number, transaction_type, amount, description } = req.body;

    logger.info('Creating transaction', {
      account: account_number,
      type: transaction_type,
      amount,
    });

    const result = await processTransaction(
      account_number,
      transaction_type,
      parseFloat(amount),
      description
    );

    return successResponse(
      res,
      result,
      SUCCESS_MESSAGES.TRANSACTION_CREATED,
      HTTP_STATUS.CREATED
    );

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
};