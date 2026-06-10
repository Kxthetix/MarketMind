# MarketMind AI 🧠📈

MarketMind AI is a production-ready, AI-powered stock intelligence SaaS platform tailored for the Indian markets (NSE/BSE). It analyzes equities, calculates real-time technical indicators, automatically detects price patterns and support/resistance zones, evaluates risks, and generates explainable, multi-agent AI research reports.

Designed with **glassmorphic Obsidian styling**, it supports secure multi-factor authentication, stripe/razorpay billing simulations, real-time alert triggers, portfolio rebalancing rules, and deployment-ready configurations.

---

## 🚀 Key Features

*   **NSE/BSE Stock Analysis**: Integrates with financial feeds to fetch, parse, and analyze market data.
*   **Technical Indicator Math**: High-performance, edge-case safe calculation of RSI, MACD, Moving Averages (SMA/EMA), VWAP, and ATR.
*   **Price Pattern Recognition**: Automatically detects candlestick patterns (e.g., Hammers, Shooting Stars, Engulfing patterns) considering wick sizes and body ratios.
*   **Support & Resistance Mapping**: Algorithmic detection of support/resistance zones and Fibonacci retracement levels with confidence scoring.
*   **Explainable AI Insights**: Multi-agent research reports powered by LangGraph, providing detailed structural breakdowns without claiming guaranteed predictions.
*   **Portfolio Intelligence**: Rebalancing suggestions, risk exposure evaluations, and user-configured real-time price alerts.
*   **Security & Scale**: Password hashing, JWT auth, OTP verification (via mock SMS/Email), Redis-based sliding window rate-limiting, and PostgreSQL async persistence.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy, `asyncpg`, LangGraph, Redis, Pydantic v2, PyTest |
| **Frontend** | React 19, Next.js 16 (Turbopack, App Router, Standalone mode), TailwindCSS / Vanilla CSS, Lucide Icons |
| **Database** | PostgreSQL (Relational Data), Redis (Caching & Rate Limiting) |
| **DevOps / Infra** | Docker, Docker Compose, Kubernetes (StatefulSets & Deployments), GitHub Actions CI/CD |

---

## 📂 Project Structure

```
MarketMind/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── agents/          # LangGraph Multi-Agent Research workflows
│   │   ├── api/             # API Endpoints (Auth, Stocks, Portfolio, Alerts, Backtests)
│   │   ├── core/            # Configuration, Security, DB & Redis connectors
│   │   ├── models/          # SQLAlchemy Database Models (PostgreSQL)
│   │   ├── schemas/         # Pydantic Schemas
│   │   └── services/        # Indicator calculations, Pattern recognition engine
│   └── tests/               # Comprehensive pytest suite
├── frontend/                 # Next.js 16 Application
│   ├── app/                 # Next.js App Router (Dashboard, Portfolios, Stocks, Auth)
│   ├── components/          # Reusable UI components (Charts, Navbar, Reports)
│   ├── context/             # Global Context providers (AuthContext)
│   └── lib/                 # HTTP Client wrapper (axios/fetch utils)
├── infra/                    # Infrastructure files
│   └── k8s/                 # Kubernetes configurations (postgres, redis, frontend, backend)
├── docker-compose.yml        # Development orchestration
└── README.md                 # Main Documentation
```

---

## ⚡ Getting Started

### Prerequisites
*   Python 3.13+
*   Node.js 18+
*   Docker & Docker Compose (Optional)

---

### Local Development Setup

#### 1. Database & Cache
Ensure you have PostgreSQL and Redis running locally, or spin them up quickly via Docker:
```bash
docker run -d --name marketmind-postgres -e POSTGRES_DB=marketmind -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
docker run -d --name marketmind-redis -p 6379:6379 redis:7-alpine
```

#### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (create a `.env` file):
   ```env
   SECRET_KEY=your_secret_key_here
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/marketmind
   REDIS_URL=redis://localhost:6379/0
   OPENAI_API_KEY=your_openai_api_key_here
   MOCK_MODE=True
   ```
5. Run the server from the repository root to resolve imports correctly:
   ```bash
   cd ..
   # PowerShell (Windows)
   $env:PYTHONPATH="."
   uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
   ```

#### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web app at [http://localhost:3000](http://localhost:3000)

---

### Run with Docker Compose
To run the entire system (Backend, Frontend, PostgreSQL, Redis) with a single command:
```bash
docker-compose up --build
```

---

## 🧪 Testing & Verification

### Running Backend Tests
Ensure your virtual environment is active and run:
```bash
cd backend
pytest
```
This runs 27 unit and integration tests covering:
*   Indicator mathematics (RSI, SMA, EMA, MACD, etc.)
*   Candlestick pattern wick and body analysis
*   User registration, login, JWT authorization
*   Portfolio alert configurations and triggering

### Running Frontend Tests
Run the Jest tests in the frontend folder:
```bash
cd frontend
npm run test
```

---

## 🛡️ Regulatory Disclaimer
MarketMind AI is an educational and analytical tool designed to support self-directed stock research. **We do not provide guaranteed trading signals or financial advisory services.** Investing in equities involves significant risk. Always consult a certified financial advisor before making actual investment decisions.
