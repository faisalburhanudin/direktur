import { useState, useCallback } from 'react'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface UseJobAutomationProps {
  url: string
  onMessagesUpdate: (messages: Message[]) => void
}

interface UseJobAutomationReturn {
  isLoading: boolean
  hasTriggeredAutomation: boolean
  triggerJobsAutomation: () => Promise<void>
}

export const useJobAutomation = ({ 
  url, 
  onMessagesUpdate 
}: UseJobAutomationProps): UseJobAutomationReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [hasTriggeredAutomation, setHasTriggeredAutomation] = useState(false)

  const triggerJobsAutomation = useCallback(async () => {
    if (hasTriggeredAutomation) return
    
    setHasTriggeredAutomation(true)
    setIsLoading(true)
    
    try {
      const response = await fetch('http://localhost:3001/api/hackernews/scrape-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      const data = await response.json()
      
      if (data.success) {
        const chatResponse = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Analyze these HackerNews job listings',
            url: url,
            automationData: data.jobs
          })
        })

        const chatData = await chatResponse.json()
        
        const initialMessage: Message = {
          id: '1',
          content: chatData.response || `Found ${data.jobs.length} jobs from HackerNews. Here's what I found...`,
          isUser: false,
          timestamp: new Date()
        }

        onMessagesUpdate([initialMessage])
      } else {
        const errorMessage: Message = {
          id: '1',
          content: 'I had trouble getting the job listings. Let me know if you\'d like me to try again.',
          isUser: false,
          timestamp: new Date()
        }
        onMessagesUpdate([errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: '1',
        content: 'I encountered an error while fetching jobs. The automation service might not be ready.',
        isUser: false,
        timestamp: new Date()
      }
      onMessagesUpdate([errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [hasTriggeredAutomation, url, onMessagesUpdate])

  return {
    isLoading,
    hasTriggeredAutomation,
    triggerJobsAutomation
  }
}