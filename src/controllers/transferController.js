const { processTransfer } = require('../services/transferService');
const { successResponse } = require('../utils/responses');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const logger = require('../config/logger');

/**
 * Process fund transfer between accounts
 * POST /api/transfers
 */
const createTransfer = async (req, res, next) => {
  try {
    const { sender_account, receiver_account, amount, description } = req.body;

    logger.info('Processing transfer', {
      sender: sender_account,
      receiver: receiver_account,
      amount,
    });

    const result = await processTransfer(
      sender_account,
      receiver_account,
      parseFloat(amount),
      description
    );

    return successResponse(
      res,
      result,
      SUCCESS_MESSAGES.TRANSFER_COMPLETED,
      HTTP_STATUS.CREATED
    );

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransfer,
};