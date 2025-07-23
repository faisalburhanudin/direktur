import { useState } from 'react'

const StarterPrompt = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
    <div className="flex items-center justify-center w-10 h-10 mb-3 bg-white border border-gray-200 rounded-lg">
      <span className="text-lg">{icon}</span>
    </div>
    <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
  </div>
)

function App() {
  const [query, setQuery] = useState('')

  const starterPrompts = [
    {
      icon: "🐙",
      title: "Get PRs for a repo",
      description: "Go to the Stagehand repo by Browserbase and get me the latest PRs"
    },
    {
      icon: "📊",
      title: "Market odds on Polymarket",
      description: "Retrieve current Polymarket odds for Elon Musk to unfollow Donald Trump on X"
    },
    {
      icon: "Y",
      title: "Retrieve jobs from YC",
      description: "Go to the Y Combinator jobs page and get me the current listings on the first page"
    },
    {
      icon: "🛍️",
      title: "Order a Nintendo Switch",
      description: ""
    },
    {
      icon: "📈",
      title: "Nasdaq earnings retrieval",
      description: ""
    },
    {
      icon: "🌐",
      title: "Book Flights",
      description: ""
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
              <svg className="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7v10c0 5.55 3.84 10 9 10 5.16 0 9-4.45 9-10V7l-10-5z"/>
                <path d="M8 11l2 2 4-4"/>
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-medium text-gray-900 mb-12">
            What would you like to automate?
          </h1>
          
          <div className="max-w-2xl mx-auto mb-4">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try 'Check stock prices on NASDAQ'"
                className="w-full px-4 py-4 text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="absolute right-2 top-2 px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 transition-colors">
                →
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-start max-w-2xl mx-auto mb-16">
            <button className="flex items-center text-gray-500 hover:text-gray-700 transition-colors">
              <span className="mr-2">+ Add context</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-6">Starter prompts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {starterPrompts.map((prompt, index) => (
              <StarterPrompt
                key={index}
                icon={prompt.icon}
                title={prompt.title}
                description={prompt.description}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
