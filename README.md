# Direktur

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   ```
   cp .env.template .env
   ```
   Then edit `.env` and add your Claude API key:
   ```
   CLAUDE_API_KEY=your_claude_api_key_here
   ```

3. Start both services:

   **Backend service** (port 3001):
   ```
   npm run server
   ```

   **Frontend service** (port 5173):
   ```
   npm run dev
   ```

   > Note: Both services need to run simultaneously. The frontend makes API calls to the backend at localhost:3001.
