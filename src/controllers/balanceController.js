const { getAccountBalance } = require('../services/balanceService');
const { successResponse } = require('../utils/responses');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const logger = require('../config/logger');

/**
 * Get account balance
 * GET /api/balance/:account_number
 */
const getBalance = async (req, res, next) => {
  try {
    const { account_number } = req.params;

    logger.info('Retrieving account balance', {
      account: account_number,
    });

    const result = await getAccountBalance(account_number);

    return successResponse(
      res,
      result,
      SUCCESS_MESSAGES.BALANCE_RETRIEVED,
      HTTP_STATUS.OK
    );

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBalance,
};