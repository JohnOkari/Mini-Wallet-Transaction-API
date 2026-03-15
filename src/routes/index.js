const express = require('express');
const router = express.Router();

// Import controllers
const { createTransaction } = require('../controllers/transactionController');
const { createTransfer } = require('../controllers/transferController');
const { getBalance } = require('../controllers/balanceController');

// Import middleware
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Banking API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

/**
 * Transaction Routes
 */

// Create transaction (deposit/withdrawal)
router.post(
  '/transactions',
  validate('createTransaction'),
  asyncHandler(createTransaction)
);

/**
 * Transfer Routes
 */

// Process fund transfer
router.post(
  '/transfers',
  validate('fundTransfer'),
  asyncHandler(createTransfer)
);

/**
 * Balance Routes
 */

// Get account balance
router.get(
  '/balance/:account_number',
  validate('getBalance'),
  asyncHandler(getBalance)
);

module.exports = router;