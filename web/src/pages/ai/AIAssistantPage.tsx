import { useState, useRef, useEffect } from 'react'
import { aiAPI } from '../../services/api/aiAPI'
import { Send, Bot, User, Upload, FileText } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  jobs?: any[]
  cvData?: any
  questions?: string[]
  type?: 'text' | 'cv_upload' | 'jobs'
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI career assistant. I can help you with:\n\n• Upload and analyze your CV\n• Understand your skills and experience\n• Find jobs that match your profile\n• Answer questions about your career\n\nYou can upload your CV or start chatting with me. What would you like to do?",
      type: 'text'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Uploaded CV: ${file.name}`,
      type: 'cv_upload'
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const formData = new FormData()
      formData.append('cv', file)

      const response = await aiAPI.uploadCV(formData)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        cvData: response.cvData,
        questions: response.questions,
        type: 'text'
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Error uploading CV:', error)
      let errorText = 'Sorry, I encountered an error uploading your CV. Please try again.'
      
      // Safely extract error message as string
      try {
        if (error?.response?.data?.error) {
          errorText = String(error.response.data.error)
        } else if (error?.response?.data?.message) {
          errorText = String(error.response.data.message)
        } else if (error?.message) {
          errorText = String(error.message)
        } else if (typeof error === 'string') {
          errorText = error
        } else if (error && typeof error === 'object') {
          // Last resort: try to stringify if it's an object
          errorText = JSON.stringify(error).substring(0, 200)
        }
      } catch (extractError) {
        // If all else fails, use default message
        errorText = 'Sorry, I encountered an error uploading your CV. Please try again.'
      }
      
      // Ensure errorText is always a string
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: String(errorText),
        type: 'text'
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text'
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      const context = messages
        .filter(m => m.type === 'text')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }))

      const searchJobs = currentInput.toLowerCase().includes('find') || 
                        currentInput.toLowerCase().includes('search') ||
                        currentInput.toLowerCase().includes('job')

      const response = await aiAPI.chat(currentInput, context, searchJobs)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        jobs: response.jobs,
        type: response.jobs ? 'jobs' : 'text'
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Error sending message:', error)
      let errorText = 'Sorry, I encountered an error. Please try again.'
      
      if (error?.response?.data?.error) {
        errorText = error.response.data.error
      } else if (error?.message) {
        errorText = error.message
      } else if (typeof error === 'string') {
        errorText = error
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        type: 'text'
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const renderMessage = (message: Message) => {
    if (message.type === 'cv_upload') {
      return (
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-3">
          <FileText size={20} />
          <span>{message.content}</span>
        </div>
      )
    }

    if (message.type === 'jobs' && message.jobs && message.jobs.length > 0) {
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap text-gray-800">{message.content}</p>
          <div className="space-y-2">
            {message.jobs.map((job: any, idx: number) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{job.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                    {job.location && (
                      <p className="text-xs text-gray-500 mt-1">{job.location}</p>
                    )}
                    {job.salary_min && (
                      <p className="text-xs text-gray-500 mt-1">
                        ${job.salary_min.toLocaleString()}
                        {job.salary_max ? ` - $${job.salary_max.toLocaleString()}` : '+'}
                      </p>
                    )}
                  </div>
                  {job.application_url && (
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
                    >
                      Apply
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Bot className="text-primary-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI Career Assistant</h1>
            <p className="text-sm text-gray-500">Powered by Hugging Face & OpenAI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="text-primary-600" size={18} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}
              >
                {renderMessage(message)}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="text-gray-600" size={18} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <Bot className="text-primary-600" size={18} />
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* File Upload Button */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload CV'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Input Field */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Ask me anything about your career, upload your CV, or search for jobs..."
                rows={1}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none max-h-32 overflow-y-auto"
                style={{ minHeight: '48px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || uploading}
              className="px-6 py-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Send size={20} />
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
