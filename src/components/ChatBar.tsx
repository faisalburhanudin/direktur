import { useState, useImperativeHandle, forwardRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useJobAutomation } from '../services/useJobAutomation'
import { SERVER_URL } from '../config'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface ChatBarProps {
  url: string
}

interface ChatBarRef {
  triggerAutomation: () => void
}

const ChatBar = forwardRef<ChatBarRef, ChatBarProps>(({ url }, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  const { isLoading: isAutomationLoading, triggerJobsAutomation } = useJobAutomation({
    url,
    onMessagesUpdate: setMessages
  })

  const isLoading = isChatLoading || isAutomationLoading

  useImperativeHandle(ref, () => ({
    triggerAutomation: triggerJobsAutomation
  }), [triggerJobsAutomation])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsChatLoading(true)

    try {
      const response = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          url: url,
          automationData: null
        }),
      })

      const data = await response.json()
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Sorry, I encountered an error.',
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error connecting to the chat service.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">LLM Chat</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.isUser
                  ? 'bg-blue-500 text-white ml-auto max-w-[80%]'
                  : 'bg-gray-100 text-gray-700 mr-auto max-w-[80%]'
              }`}
            >
              {message.isUser ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-gray-700">{children}</h1>,
                      h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-gray-700">{children}</h2>,
                      p: ({children}) => <p className="text-sm mb-2 text-gray-700">{children}</p>,
                      code: ({children}) => <code className="text-xs bg-gray-200 px-1 rounded">{children}</code>,
                      ol: ({children}) => <ol className="text-sm mb-2 ml-4 list-decimal text-gray-700">{children}</ol>,
                      ul: ({children}) => <ul className="text-sm mb-2 ml-4 list-disc text-gray-700">{children}</ul>,
                      li: ({children}) => <li className="mb-1 text-gray-700">{children}</li>
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="bg-gray-100 p-3 rounded-lg mr-auto max-w-[80%]">
              <p className="text-sm text-gray-700">Thinking...</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about the page..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
})

export default ChatBar
