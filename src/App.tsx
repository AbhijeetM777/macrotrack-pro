import React from 'react'
import { PromptInputBox } from './components/ui/ai-prompt-box'
import { EtherealShadow } from './components/ui/etheral-shadow'
import './styles/globals.css'

function App() {
  const handleSendMessage = (message: string, files?: File[]) => {
    console.log('Message:', message)
    console.log('Files:', files)
  }

  return (
    <div className="w-full h-screen bg-zinc-900">
      <EtherealShadow
        color="rgba(100, 120, 200, 0.4)"
        animation={{ scale: 75, speed: 65 }}
        noise={{ opacity: 0.8, scale: 1.2 }}
        sizing="fill"
        className="w-full h-screen"
      >
        <div className="flex flex-col w-full max-w-[500px] items-center justify-center gap-8 px-4">
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
              MacroTrack <span className="text-accent-lime">Pro</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 drop-shadow">
              Your AI-powered nutrition companion
            </p>
          </div>
          <PromptInputBox
            onSend={handleSendMessage}
            placeholder="Ask about your macros, nutrition, or fitness goals..."
          />
        </div>
      </EtherealShadow>
    </div>
  )
}

export default App
