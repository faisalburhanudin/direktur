import { useState, useEffect, useRef, useCallback } from 'react';

interface LiveBrowserViewProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export default function LiveBrowserView({ url, onUrlChange }: LiveBrowserViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const drawImageToCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Calculate scaling to fit image while maintaining aspect ratio
    const scaleX = canvas.width / img.width;
    const scaleY = canvas.height / img.height;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    // Clear canvas and draw image
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
  }, []);

  const stopScreenshotStream = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/screenshots/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: 'default' })
      });

      if (response.ok) {
        setIsStreaming(false);
        setConnectionStatus('Streaming stopped');
        console.log('Screenshot streaming stopped');
      }
    } catch (error) {
      console.error('Failed to stop screenshot stream:', error);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (isStreaming) {
      stopScreenshotStream();
    }
  }, [isStreaming, stopScreenshotStream]);

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket('ws://localhost:3001/screenshots');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('WebSocket connected');
    };

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        // Handle binary screenshot data
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            drawImageToCanvas(img);
            setLastUpdateTime(new Date());
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(event.data);
      } else {
        // Handle JSON status messages
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket status:', message);
        } catch (error) {
          console.warn('Invalid WebSocket message:', error);
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('WebSocket disconnected');
      setIsStreaming(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('WebSocket error');
    };
  }, [drawImageToCanvas]);

  const startScreenshotStream = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/screenshots/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageId: 'default',
          options: {
            quality: 80,
            periodicInterval: 2000,
            enableEventCapture: true,
            enableMutationObserver: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start screenshot stream');
      }

      setIsStreaming(true);
      setConnectionStatus('Streaming active');
      console.log('Screenshot streaming started');
    } catch (error) {
      console.error('Failed to start screenshot stream:', error);
      setConnectionStatus('Streaming failed');
    }
  }, []);

  const initializeBrowser = useCallback(async () => {
    try {
      // Launch browser
      const launchResponse = await fetch('http://localhost:3001/api/browser/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!launchResponse.ok) {
        throw new Error('Failed to launch browser');
      }

      // Initialize WebSocket connection
      connectWebSocket();
      setIsConnected(true);
      setConnectionStatus('Connected');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      setConnectionStatus('Failed to connect');
    }
  }, [connectWebSocket]);

  const navigateToUrl = useCallback(async (targetUrl: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/browser/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, pageId: 'default' })
      });

      if (!response.ok) {
        throw new Error('Failed to navigate');
      }

      const data = await response.json();
      console.log('Navigation successful:', data);
      
      // Start screenshot streaming if not already started
      if (!isStreaming) {
        startScreenshotStream();
      }
    } catch (error) {
      console.error('Navigation failed:', error);
      setConnectionStatus('Navigation failed');
    }
  }, [isStreaming, startScreenshotStream]);

  // Initialize browser and WebSocket connection
  useEffect(() => {
    initializeBrowser();
    return cleanup;
  }, [initializeBrowser, cleanup]);

  // Handle URL changes
  useEffect(() => {
    if (url && isConnected) {
      navigateToUrl(url);
    }
  }, [url, isConnected, navigateToUrl]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && isConnected) {
      navigateToUrl(url);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Browser Controls */}
      <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center space-x-2">
        <button className="w-3 h-3 bg-red-500 rounded-full"></button>
        <button className="w-3 h-3 bg-yellow-500 rounded-full"></button>
        <button className="w-3 h-3 bg-green-500 rounded-full"></button>
        
        <form onSubmit={handleUrlSubmit} className="flex-1 mx-4 flex items-center space-x-2">
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Enter URL..."
            className="flex-1 px-3 py-1 bg-white border border-gray-300 rounded text-sm"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !url}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go
          </button>
        </form>

        {/* Status indicators */}
        <div className="flex items-center space-x-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-gray-600">{connectionStatus}</span>
          
          {isStreaming && (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-600">Live</span>
            </>
          )}
        </div>
      </div>
      
      {/* Live Browser Content */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-hidden">
        <canvas 
          ref={canvasRef}
          className="max-w-full max-h-full border border-gray-300 bg-white shadow-lg"
          style={{ minHeight: '400px', minWidth: '600px' }}
        />
        
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <div className="text-center">
              <div className="text-gray-500 mb-2">
                {isConnected ? 'Enter a URL to start viewing' : 'Connecting to browser...'}
              </div>
              {lastUpdateTime && (
                <div className="text-xs text-gray-400">
                  Last update: {lastUpdateTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}