# FQuantix

FQuantix is a stock and cryptocurrency paper trading simulation platform. It allows users to practice trading using virtual cash with real-time market data in a safe, risk-free environment.

## Project Structure

This is a monorepo setup containing the decoupled services of the platform:

* **[backend/]**: A modular Node.js & TypeScript API driving order execution, market simulators, WebSocket pricing feeds, and portfolio analytics.
* **frontend**: (Coming Soon) React-based interface for portfolio tracking, charts, and trading panels.

---

## Backend Features
* **Authentication**: Secure registration, login, and JWT-guarded routes.
* **Virtual Portfolio**: Default balance of ₹1,00,000 cash, with automatic tracking of invested value, realized/unrealized P&L, and portfolio resets.
* **Market Simulator**: A background service modeling live price changes for supported stocks (AAPL, TSLA, MSFT) and cryptos (BTC, ETH, SOL).
* **Real-time Price Stream**: WebSockets streaming simulated asset prices directly from cache channels.
* **Trade Engine**: An asynchronous, atomic queue execution system (`LPUSH`/`RPOP`) that executes transactions safely across scaled instances.

---

## Getting Started

To set up and run the backend, navigate to the backend directory and follow the instructions in the backend documentation:

```bash
cd backend
npm install
```

For database connection settings and runner commands, refer to the [Backend README](file:///c:/Users/user/OneDrive/Desktop/Coders%20Adda/FQuantix/backend/README.md).
