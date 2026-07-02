# FQuantix Backend

A simulated paper trading engine for stocks and crypto.

## Tech Stack
* **Backend**: Node.js (TypeScript) + Express
* **Database**: PostgreSQL (via Prisma ORM)
* **Queue**: Redis (falls back to memory if offline)
* **Real-time Feed**: WebSockets (`ws` library)

## Key Features
* **Repository Pattern**: Decouples business logic from database operations, making it easy to swap engines or write tests.
* **Atomic Order Queue**: Uses Redis `RPOP` to process orders sequentially, avoiding double-execution across multiple server instances.
* **Transaction Safe**: Trades execute inside database transactions to ensure accurate user balances and holding quantities.

## Setup Instructions

### 1. Prerequisites
Make sure Node.js (v20+) is installed. Redis is optional; if not running locally, the server falls back to in-memory caching and messaging.

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Configuration
Configure your PostgreSQL database connection URI string as the `DATABASE_URL` environment variable inside the `.env` file. Then initialize the database schema and run migrations with:
```bash
npx prisma migrate dev --name init
```

### 4. Running the App
* **Development (auto-reload)**:
  ```bash
  npm run dev
  ```
* **Production Build**:
  ```bash
  npm run build
  npm start
  ```

## Folder Structure
```text
src/
├── config/        # Environment config, DB initialization, Cache managers
├── shared/        # App logger, Global HTTP errors
├── middleware/    # Auth guards, Request body Zod validators, Error handlers
└── modules/       # Decoupled domain modules (containing routes, controllers, services, repositories)
    ├── auth       # Registration, Login, Profile extraction
    ├── market     # Watchlist CRUD, Price simulator background workers
    ├── portfolio  # Virtual cash/holdings tracking, Order engine, execution queue
    └── history    # Paginated trade logs, Return rate & Win/Loss analytics
```

## API Endpoints

### Authentication (`/api/auth`)
* `POST /signup` - Register a new account (sets up ₹1,000,000 virtual balance)
* `POST /login` - Log in and obtain JWT
* `GET /profile` - Retrieve current user profile (requires Bearer token)

### Market Data (`/api/market`)
* `GET /assets` - Fetch list of supported stock/crypto rates
* `GET /watchlist` - Retrieve user's watchlist with live simulated rates
* `POST /watchlist` - Add a ticker (e.g. `BTC`, `AAPL`) to watchlist
* `DELETE /watchlist/:ticker` - Delete a ticker from watchlist

### Portfolios & Orders (`/api`)
* `GET /portfolio` - Fetch virtual balance, asset breakdown, and unrealized P&L
* `POST /portfolio/reset` - Clear holdings and restore virtual balance back to ₹1,000,000
* `POST /orders` - Queue a market BUY/SELL order
* `GET /history` - Fetch paginated logs of completed/failed transactions
* `GET /analytics` - Get win/loss ratios, best/worst trades, and growth chart coordinates
