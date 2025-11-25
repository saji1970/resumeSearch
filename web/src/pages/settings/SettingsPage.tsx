import { useState } from 'react'
import { Settings, Key, CheckCircle, AlertCircle, Info, Copy } from 'lucide-react'

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const apiKeys = [
    {
      name: 'OpenAI API Key',
      description: 'Used for resume parsing, cover letter generation, and AI chat fallback',
      link: 'https://platform.openai.com/api-keys',
      linkText: 'Get OpenAI Key',
      envVar: 'OPENAI_API_KEY',
      status: 'Configured (check backend/.env)'
    },
    {
      name: 'Serper API Key',
      description: 'Used for web job search via Google Jobs',
      link: 'https://serper.dev',
      linkText: 'Get Serper Key',
      envVar: 'SERPER_API_KEY',
      status: 'Configured'
    },
    {
      name: 'Hugging Face API Key',
      description: 'Used for conversational AI',
      link: 'https://huggingface.co/settings/tokens',
      linkText: 'Get Hugging Face Key',
      envVar: 'HUGGINGFACE_API_KEY',
      status: 'Configured'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-primary-600" size={28} />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-blue-800 font-medium">How to Update API Keys</p>
              <p className="text-sm text-blue-700 mt-1">
                API keys are stored securely in the backend/.env file. To update them:
              </p>
              <ol className="text-sm text-blue-700 mt-2 ml-4 list-decimal space-y-1">
                <li>Edit the <code className="bg-blue-100 px-1 rounded">backend/.env</code> file</li>
                <li>Update the API key value (e.g., <code className="bg-blue-100 px-1 rounded">OPENAI_API_KEY=sk-your-key</code>)</li>
                <li>Restart the backend server for changes to take effect</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div key={key.name} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Key className="text-primary-600" size={20} />
                  <h2 className="text-xl font-semibold text-gray-900">{key.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={20} />
                  <span className="text-sm text-green-600 font-medium">{key.status}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{key.description}</p>
              <div className="flex items-center gap-4">
                <a
                  href={key.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline text-sm font-medium"
                >
                  {key.linkText} →
                </a>
                <button
                  onClick={() => copyToClipboard(key.envVar, key.name)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Copy size={16} />
                  {copied === key.name ? 'Copied!' : 'Copy env var name'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info size={20} />
            Quick Reference
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900 mb-1">Environment Variable Names:</p>
              <div className="space-y-1 font-mono text-xs bg-white p-3 rounded border">
                <div>OPENAI_API_KEY=sk-...</div>
                <div>SERPER_API_KEY=...</div>
                <div>HUGGINGFACE_API_KEY=hf_...</div>
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              <strong>Note:</strong> After updating API keys in backend/.env, restart the backend server 
              by stopping and running <code className="bg-gray-200 px-1 rounded">npm run dev</code> again.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

