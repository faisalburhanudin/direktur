import { useState, useCallback, useRef } from 'react'
import LiveBrowserView from './components/LiveBrowserView'
import ChatBar from './components/ChatBar'

function BrowserViewer() {
  const [url, setUrl] = useState('https://news.ycombinator.com/jobs')
  const chatBarRef = useRef<{ triggerAutomation: () => void }>(null)

  const handleBrowserReady = useCallback(() => {
    chatBarRef.current?.triggerAutomation()
  }, [])


  return (
    <div className="h-screen flex">
      {/* Live Browser View */}
      <LiveBrowserView url={url} onUrlChange={setUrl} onBrowserReady={handleBrowserReady} />
      
      <ChatBar 
        ref={chatBarRef}
        url={url} 
      />
    </div>
  )
}

export default BrowserViewer