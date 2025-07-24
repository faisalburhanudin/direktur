# Direktur Architecture

Direktur is a web automation platform that provides interactive browser control through real-time streaming and AI-powered analysis capabilities. The system combines browser automation, WebSocket streaming, and LLM integration to create an intelligent web interaction tool.

## Overview

The application consists of two main components:
- **Backend Server** (`server.ts`): Express.js server handling browser automation, WebSocket streaming, and Claude API integration
- **Frontend Client** (React/TypeScript): Interactive web interface with live browser view and chat functionality

## Core Architecture

### Backend Components

#### 1. Express Server (`server.ts`)
The main application server that coordinates all backend services:
- **Port**: 3001
- **CORS enabled** for frontend communication
- **Claude API Integration**: Proxies requests to Anthropic's Claude API
- **Environment Variables**: Requires `CLAUDE_API_KEY`

**Key Endpoints**:
- `/api/chat` - Claude AI chat integration
- `/api/browser/*` - Browser automation controls
- `/api/screenshots/*` - Screenshot streaming management
- `/api/hackernews/scrape-jobs` - Specialized web scraping

#### 2. Browser Management (`src/automation/browser-manager.ts`)
Centralized browser lifecycle management using Patchright (Playwright fork):
- **Browser Engine**: Chromium with custom launch arguments
- **Page Management**: Multi-page support with unique page IDs
- **Viewport Configuration**: Standardized 1920x1080 resolution
- **Headless Mode**: Disabled for interactive use

**Key Features**:
- Persistent browser sessions
- Page creation and navigation
- Viewport standardization
- Resource cleanup

#### 3. Screenshot Capture (`src/automation/screenshot-capture.ts`)
Real-time screenshot capture system with multiple triggers:
- **Dual Capture Methods**: CDP (Chrome DevTools Protocol) + Playwright fallback
- **Event-Driven Capture**: DOM mutations, user interactions, console events
- **Periodic Capture**: Configurable interval-based screenshots
- **Performance Optimized**: Activity-based triggering

**Trigger Types**:
- `periodic` - Regular interval captures
- `activity` - DOM change or user interaction
- `console` - Console output events
- `manual/forced` - Programmatic requests

#### 4. WebSocket Server (`src/services/websocket-server.ts`)
Real-time screenshot streaming infrastructure:
- **Protocol**: WebSocket on `/screenshots` path
- **Binary Data**: Direct screenshot buffer transmission
- **JSON Messages**: Status and control messages
- **Client Management**: Connection limits, heartbeat monitoring
- **Page Filtering**: Optional page-specific subscriptions

**Message Types**:
- Binary: Screenshot image data
- JSON: Status updates, errors, connection info

#### 5. Automation API (`src/services/automation-api.ts`)
RESTful API layer for browser operations:
- **Browser Control**: Launch, navigate, close, restart
- **Click Interaction**: Coordinate-based clicking
- **Screenshot Management**: Stream start/stop, status
- **Web Scraping**: Specialized HackerNews job extraction

### Frontend Components

#### 1. Main Application (`src/App.tsx`)
Entry point with navigation and starter prompts:
- **Starter Prompts**: Pre-configured automation tasks
- **View Management**: Home vs. browser view switching
- **URL Input**: Direct automation target specification

#### 2. Browser Viewer (`src/BrowserViewer.tsx`)
Split-pane interface combining live browser view and chat:
- **Live Browser Panel**: Real-time screenshot display
- **Chat Sidebar**: Claude AI integration for page analysis
- **Auto-triggering**: Automated HackerNews job analysis
- **Message Management**: Chat history and state

#### 3. Live Browser View (`src/components/LiveBrowserView.tsx`)
Core browser interaction component:
- **Canvas Rendering**: Screenshot display with scaling
- **Click Mapping**: Canvas-to-browser coordinate transformation
- **WebSocket Integration**: Real-time screenshot streaming
- **Browser Controls**: URL navigation, connection status
- **Visual Feedback**: Click indicators, loading states

**Coordinate Mapping Algorithm**:
```
browserX = (canvasClickX - offsetX) / scale
browserY = (canvasClickY - offsetY) / scale
```

## Data Flow

### 1. Browser Initialization
```
Frontend → POST /api/browser/launch → BrowserManager.launch()
       ↓
WebSocket connection established
       ↓
Screenshot streaming begins
```

### 2. Page Navigation
```
User enters URL → POST /api/browser/navigate → BrowserManager.navigateTo()
              ↓
Screenshot capture activated
              ↓
Live view updates via WebSocket
```

### 3. User Interaction
```
Canvas click → Coordinate transformation → POST /api/browser/click
           ↓
Browser executes click → DOM changes → Screenshot triggered
                      ↓
WebSocket broadcasts new screenshot
```

### 4. AI Analysis
```
User message → POST /api/chat → Claude API call
           ↓
Response displayed in chat sidebar
```

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Browser Automation**: Patchright (Playwright fork)
- **WebSocket**: `ws` library
- **AI Integration**: Anthropic Claude API

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4.x
- **Build Tool**: Vite 7.x
- **Canvas**: HTML5 Canvas for screenshot rendering

### Development Tools
- **TypeScript**: Type safety across the stack
- **ESLint**: Code linting with React-specific rules
- **PostCSS**: CSS processing with Tailwind

## Key Design Patterns

### 1. Event-Driven Architecture
- Screenshot capture responds to DOM events
- WebSocket broadcasts for real-time updates
- EventEmitter pattern for component communication

### 2. Dual-Protocol Communication
- HTTP REST API for control operations
- WebSocket for real-time data streaming
- Separation of concerns between control and data

### 3. Coordinate System Abstraction
- Canvas display coordinates
- Browser viewport coordinates
- Transformation layer for click mapping

### 4. Fallback Mechanisms
- CDP → Playwright screenshot capture
- Multiple trigger types for screenshot capture
- Error handling with graceful degradation

## Configuration

### Environment Variables
- `CLAUDE_API_KEY`: Required for AI functionality
- Development: `.env` file support

### Browser Configuration
- Viewport: 1920x1080 (standardized)
- Headless: Disabled for interaction
- Security: Web security disabled for automation

### Performance Tuning
- Screenshot quality: 80% (configurable)
- Periodic interval: 2000ms
- WebSocket payload limit: 10MB
- Client connection limit: 50

## Specialized Features

### HackerNews Integration
Automated job scraping with structured data extraction:
- Direct navigation to `news.ycombinator.com/jobs`
- DOM parsing for job listings
- Automatic Claude analysis of scraped data
- Structured JSON response format

### Real-time Interaction
- Sub-second screenshot updates
- Click-to-coordinate mapping
- Visual click feedback
- Connection status monitoring

This architecture provides a scalable foundation for web automation tasks while maintaining real-time interactivity and AI-powered analysis capabilities.
