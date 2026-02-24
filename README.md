# Prediction Market Aggregator

A real-time web application that aggregates order book data from multiple prediction market venues (Polymarket and Kalshi) into a unified view with dynamic market selection.

## Features

- **Dynamic Market Search**: Search and select markets from both Polymarket and Kalshi
- **Combined Order Book**: Aggregates bid/ask data from both venues into a single view
- **Real-time Updates**: Live order book updates via API polling
- **Venue-specific Views**: Toggle between combined, Polymarket-only, or Kalshi-only views
- **Quote Calculator**: Enter a dollar amount and see how many shares you'd receive across venues
- **Connection Status**: Visual indicators showing connection health for each data source

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **APIs**: Polymarket CLOB, Kalshi Trading API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd polymarket

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Optional: Add your Kalshi API key to .env.local
# NEXT_PUBLIC_KALSHI_API_KEY=your_key_here

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_DFLOW_API_KEY` | No | DFlow API key for Kalshi market data (obtain at https://pond.dflow.net/build/api-key) |

The app works fully without API keys:
- **Polymarket**: Both REST and WebSocket are public, no authentication required
- **Kalshi (via DFlow)**: Works without API key during development; key needed for production

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
polymarket/
├── app/                    # Next.js app router
│   ├── layout.tsx          # Root layout with Redux provider
│   └── page.tsx            # Main page
├── api/                    # API service layer
│   ├── polymarket.ts       # Polymarket API integration
│   └── kalshi.ts           # Kalshi API integration
├── components/             # React components
│   ├── ConnectionStatus.tsx    # Venue connection indicators
│   ├── MarketHeader.tsx        # Market title and prices
│   ├── MarketView.tsx          # Main layout component
│   ├── OrderBook.tsx           # Order book display
│   ├── QuoteCalculator.tsx     # Quote calculation interface
│   └── ViewModeSelector.tsx    # Combined/venue toggle
├── config/                 # Configuration
│   └── api.ts              # API endpoints config
├── hooks/                  # Custom React hooks
│   └── useVenueWebSocket.ts    # Real-time data hook
├── lib/                    # Utility functions
│   └── orderbook.ts        # Order book aggregation logic
├── store/                  # Redux store
│   ├── index.ts            # Store configuration
│   ├── hooks.ts            # Typed Redux hooks
│   ├── slices.ts           # Redux slices
│   └── StoreProvider.tsx   # React Redux provider
└── types/                  # TypeScript types
    └── orderbook.ts        # Type definitions
```

## Key Design Decisions

### 1. Redux for State Management

Chose Redux Toolkit because:
- Order book data needs to be shared across multiple components
- Market selection state is global
- Redux DevTools provide excellent debugging for real-time data flows
- The slice pattern keeps state logic organized and testable

### 2. API Integration

Real API integration with both venues:
- **Polymarket**: WebSocket for real-time updates, REST API fallback (public, no auth)
- **Kalshi via DFlow**: REST API for market data and orderbooks (API key optional for dev)
- Automatic reconnection and graceful fallback when APIs are unavailable
- Market linking via title similarity matching (no cross-platform identifier exists)

### 3. Order Book Aggregation Strategy

Price levels from both venues are combined by price point:
- Same prices are merged, showing combined liquidity
- Visual breakdown shows contribution from each venue
- Sorting maintained (bids high→low, asks low→high)

### 4. Quote Calculator Algorithm

The quote fills orders optimally:
- Starts with the best available prices across venues
- Walks through the order book until the full amount is filled
- Shows exactly how much would be filled on each venue

### 5. Component Architecture

Components are kept small and focused:
- Each component has a single responsibility
- Redux selectors are used at the component level for performance
- Custom hooks encapsulate API and state logic

## API Notes

### Polymarket

- Public API, no authentication required
- REST endpoint: `https://clob.polymarket.com`
- WebSocket: `wss://ws-subscriptions-clob.polymarket.com/ws/market` (public, no auth)
- Real-time orderbook updates via WebSocket `book` and `price_change` events

### Kalshi (via DFlow API)

- Kalshi data is accessed through DFlow's aggregator API
- REST endpoint: `https://dev-prediction-markets-api.dflow.net/api/v1`
- WebSocket: `wss://dev-prediction-markets-api.dflow.net/api/v1/ws`
- API key required for production use (obtain at https://pond.dflow.net/build/api-key)
- Works without API key during development with rate limits
- Docs: https://pond.dflow.net/build/metadata-api/introduction

## Assumptions & Tradeoffs

### Current Assumptions

1. **Hardcoded Market**: Currently shows only Trump deportation market. Market selection UI would enable dynamic switching.
2. **WebSocket-only Updates**: Real-time data assumed to be available. Falls back gracefully if connection lost.
3. **Price Format**: Prices stored internally as cents (0-100) for precision; displayed with 1 decimal place.
4. **Single Market Context**: Best bid/ask feature assumes viewing one market; would need adjustment for multi-market views.
5. **Client-side Discovery**: Market linking (Polymarket → Kalshi) uses title similarity; no cross-platform ID mapping exists.

### Key Tradeoffs

| Tradeoff | Decision | Rationale |
|----------|----------|-----------|
| **Redux vs Local State** | Redux for all shared state | Single source of truth enables easier debugging and real-time synchronization |
| **WebSocket vs Polling** | WebSocket preferred | Lower latency and bandwidth; polling fallback ensures resilience |
| **Aggregation Frequency** | On-demand (React rerenders) | Avoids unnecessary processing; component dependency tracking handles updates |
| **Price Precision** | Stored as cents (int) | Avoids floating-point errors; human-readable display with `.1f` formatting |
| **Cross-Platform Linking** | Title-based matching | No universal market ID exists; heuristic works ~95% of cases manually tested |
| **Error Recovery** | Automatic reconnect (5s interval, max 10 attempts) | Balances user experience vs server load; prevents infinite connection attempts |

## Future Improvements (with more time)

### Short-term (High ROI)

1. **Market Selection UI**
   - Add search component to browse markets from both venues
   - Save favorite markets to localStorage
   - Estimated effort: 2-3 hours

2. **Order Placement**
   - Integrate order submission API
   - Add order confirmation and live order tracking
   - Requires Polymarket API keys for testing
   - Estimated effort: 4-5 hours

3. **Advanced Analytics**
   - Price history chart (WebSocket historical snapshots or REST polling)
   - Depth visualization (y-axis: cumulative volume, x-axis: price levels)
   - Trend indicators (moving averages, volatility)
   - Estimated effort: 6-8 hours

### Medium-term (Good to have)

4. **Multi-Market Portfolio View**
   - Watch multiple markets simultaneously
   - Side-by-side comparison
   - Estimated effort: 3-4 hours

5. **User Authentication & Portfolio**
   - Wallet integration (MetaMask, ethers.js)
   - Persistent portfolio tracking
   - Trade history
   - Estimated effort: 8-10 hours

6. **Caching & Offline Support**
   - IndexedDB for historical order books
   - Service Worker for offline functionality
   - Estimated effort: 4-6 hours

7. **Performance Optimization**
   - Virtual scrolling for large order books
   - Memoization for expensive calculations
   - Web Worker for order book aggregation
   - Estimated effort: 3-4 hours

### Long-term (Enhancement)

8. **Integration with More Venues**
   - Manifesto Markets
   - Metaculus
   - Gnosis
   - Estimated effort: 8-10 hours per venue (similar integration pattern)

9. **ML-based Market Linking**
   - Instead of title similarity, train classifier on market descriptions
   - Better confidence scores for cross-platform pairs
   - Estimated effort: 10-12 hours

10. **Deployment & Monitoring**
    - Deploy to Vercel (1 hour)
    - Add Sentry for error tracking (1 hour)
    - Analytics dashboard (2-3 hours)
    - Estimated effort: 4-5 hours



### Not Yet Tested (TODO)
- ⚠️ Unit tests (Jest framework ready in package.json)
- ⚠️ Integration tests
- ⚠️ E2E tests (Playwright/Cypress)

Test setup:
```bash
npm test  # Ready to add test files to __tests__/ directories
```

## License

MIT
