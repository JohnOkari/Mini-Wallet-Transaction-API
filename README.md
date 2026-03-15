# Banking API

A professional RESTful API for banking operations including transaction management, fund transfers, and balance inquiries. Built with Node.js, Express, and PostgreSQL.

## 🚀 Features

- **Transaction Management**: Create deposit and withdrawal transactions
- **Fund Transfers**: Transfer money between customer accounts
- **Balance Inquiry**: Retrieve account balance with transaction history
- **Input Validation**: Comprehensive validation using Joi
- **Error Handling**: Robust error handling with detailed logging
- **Logging**: Winston-based logging system
- **Database Transactions**: ACID-compliant operations using PostgreSQL
- **Beautiful Code**: Clean architecture with separation of concerns

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd banking-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL database

Create a new database:

```bash
psql -U postgres
CREATE DATABASE banking_db;
\q
```

### 4. Run the database schema

```bash
psql -U postgres -d banking_db -f src/models/schema.sql
```

### 5. Configure environment variables

Copy the `.env.example` file to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_db
DB_USER=postgres
DB_PASSWORD=your_password

APP_NAME=Banking API
LOG_LEVEL=info
```

### 6. Start the server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Health Check
Check if the API is running.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "success": true,
  "message": "Banking API is running",
  "timestamp": "2024-12-17T10:30:00.000Z",
  "environment": "development"
}
```

#### 2. Create Transaction
Create a deposit or withdrawal transaction.

**Endpoint:** `POST /api/transactions`

**Request Body:**
```json
{
  "account_number": "ACC10000000001",
  "transaction_type": "deposit",
  "amount": 5000.00,
  "description": "Monthly salary deposit"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction_id": "uuid",
    "reference_number": "TXN1702810200001234",
    "account_number": "ACC10000000001",
    "customer_name": "John Doe",
    "transaction_type": "deposit",
    "amount": "5000.00",
    "balance_before": "10000.00",
    "balance_after": "15000.00",
    "description": "Monthly salary deposit",
    "status": "completed",
    "timestamp": "2024-12-17T10:30:00.000Z"
  },
  "timestamp": "2024-12-17T10:30:00.000Z"
}
```

**Validation Rules:**
- `account_number`: Required, must be 14 characters
- `transaction_type`: Required, must be "deposit" or "withdrawal"
- `amount`: Required, must be positive, between 1 and 10,000,000
- `description`: Optional, max 500 characters

#### 3. Fund Transfer
Transfer money between two accounts.

**Endpoint:** `POST /api/transfers`

**Request Body:**
```json
{
  "sender_account": "ACC10000000001",
  "receiver_account": "ACC10000000002",
  "amount": 2000.00,
  "description": "Payment for services"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "transfer_id": "uuid",
    "transfer_reference": "TRF1702810200005678",
    "sender": {
      "account_number": "ACC10000000001",
      "name": "John Doe",
      "transaction_reference": "TXN1702810200001234",
      "balance_before": "15000.00",
      "balance_after": "13000.00"
    },
    "receiver": {
      "account_number": "ACC10000000002",
      "name": "Jane Smith",
      "transaction_reference": "TXN1702810200005679",
      "balance_before": "5000.00",
      "balance_after": "7000.00"
    },
    "amount": "2000.00",
    "description": "Payment for services",
    "status": "completed",
    "timestamp": "2024-12-17T10:35:00.000Z"
  },
  "timestamp": "2024-12-17T10:35:00.000Z"
}
```

**Validation Rules:**
- `sender_account`: Required, must be 14 characters
- `receiver_account`: Required, must be 14 characters, must be different from sender
- `amount`: Required, must be positive, between 1 and 10,000,000
- `description`: Optional, max 500 characters

#### 4. Get Account Balance
Retrieve account balance and transaction history.

**Endpoint:** `GET /api/balance/:account_number`

**Example:** `GET /api/balance/ACC10000000001`

**Response:**
```json
{
  "success": true,
  "message": "Balance retrieved successfully",
  "data": {
    "account_details": {
      "account_number": "ACC10000000001",
      "account_holder": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+254700000001",
      "account_status": "active",
      "member_since": "2024-01-01T00:00:00.000Z"
    },
    "balance": {
      "current_balance": "13000.00",
      "currency": "KES",
      "last_updated": "2024-12-17T10:35:00.000Z"
    },
    "transaction_summary": {
      "total_transactions": 3,
      "total_credits": "15000.00",
      "total_debits": "2000.00",
      "net_flow": "13000.00"
    },
    "recent_transactions": [
      {
        "transaction_id": "uuid",
        "type": "transfer_out",
        "amount": "2000.00",
        "balance_before": "15000.00",
        "balance_after": "13000.00",
        "description": "Payment for services",
        "reference": "TXN1702810200001234",
        "status": "completed",
        "date": "2024-12-17T10:35:00.000Z"
      }
    ]
  },
  "timestamp": "2024-12-17T10:40:00.000Z"
}
```

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2024-12-17T10:30:00.000Z"
}
```

**Common Status Codes:**
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

## 🗂️ Project Structure

```
banking-api/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # Database connection
│   │   └── logger.js     # Logger configuration
│   ├── controllers/      # Request handlers
│   │   ├── transactionController.js
│   │   ├── transferController.js
│   │   └── balanceController.js
│   ├── middleware/       # Custom middleware
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── models/           # Database schemas
│   │   └── schema.sql
│   ├── routes/           # API routes
│   │   └── index.js
│   ├── services/         # Business logic
│   │   ├── transactionService.js
│   │   ├── transferService.js
│   │   └── balanceService.js
│   ├── utils/            # Utility functions
│   │   ├── constants.js
│   │   └── responses.js
│   └── app.js            # Express app setup
├── logs/                 # Application logs
├── .env                  # Environment variables
├── .env.example          # Environment template
├── .gitignore
├── package.json
├── server.js             # Server entry point
└── README.md
```

## 🧪 Testing the API

### Using cURL

**Create a deposit:**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "account_number": "ACC10000000001",
    "transaction_type": "deposit",
    "amount": 5000,
    "description": "Test deposit"
  }'
```

**Transfer funds:**
```bash
curl -X POST http://localhost:3000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sender_account": "ACC10000000001",
    "receiver_account": "ACC10000000002",
    "amount": 1000,
    "description": "Test transfer"
  }'
```

**Get balance:**
```bash
curl http://localhost:3000/api/balance/ACC10000000001
```

### Using Postman

1. Import the API endpoints into Postman
2. Set the base URL to `http://localhost:3000/api`
3. Test each endpoint with the sample payloads provided above

## 📝 Sample Test Accounts

The database schema includes three sample accounts for testing:

| Account Number | Name | Email | Initial Balance |
|---------------|------|-------|-----------------|
| ACC10000000001 | John Doe | john.doe@example.com | 10,000.00 |
| ACC10000000002 | Jane Smith | jane.smith@example.com | 5,000.00 |
| ACC10000000003 | Bob Johnson | bob.johnson@example.com | 15,000.00 |

## 🔒 Security Features

- Input validation and sanitization
- SQL injection prevention via parameterized queries
- Database transaction locks to prevent race conditions
- Error message sanitization in production
- Request logging for audit trails

## 📊 Logging

The application uses Winston for logging:

- `logs/error.log`: Error-level logs
- `logs/combined.log`: All logs
- `logs/exceptions.log`: Uncaught exceptions
- `logs/rejections.log`: Unhandled promise rejections

## 🚨 Error Handling

The API implements comprehensive error handling:

- Validation errors with detailed field information
- Database errors with appropriate HTTP status codes
- Transaction rollback on failures
- Graceful error messages for clients
- Detailed logging for debugging

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

John Okari - johnnokari@gmail.com

## 🙏 Acknowledgments

- Express.js team for the excellent web framework
- PostgreSQL community for the robust database
- Winston for comprehensive logging
- Joi for validation

---