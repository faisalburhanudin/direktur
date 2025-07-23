import { useState } from 'react'

function BrowserViewer() {
  const [url, setUrl] = useState('https://www.ycombinator.com/jobs')

  return (
    <div className="h-screen flex">
      {/* Browser View */}
      <div className="flex-1 flex flex-col">
        {/* Browser Controls */}
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center space-x-2">
          <button className="w-3 h-3 bg-red-500 rounded-full"></button>
          <button className="w-3 h-3 bg-yellow-500 rounded-full"></button>
          <button className="w-3 h-3 bg-green-500 rounded-full"></button>
          <div className="flex-1 mx-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-1 bg-white border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
        
        {/* Website Content */}
        <div className="flex-1">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title="Browser View"
          />
        </div>
      </div>
      
      {/* Chat Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">LLM Chat</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                I can help you navigate and analyze the Y Combinator jobs page. What would you like to know?
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask about the jobs page..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrowserViewer