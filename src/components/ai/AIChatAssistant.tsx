import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  X,
  Minimize2,
  Maximize2,
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAIChatStore, type ChatMode } from '@/stores/aiChatStore'

export function AIChatAssistant() {
  const isOpen = useAIChatStore((s) => s.isOpen)
  const isMinimized = useAIChatStore((s) => s.isMinimized)
  const isLoading = useAIChatStore((s) => s.isLoading)
  const activeMode = useAIChatStore((s) => s.activeMode)
  const messages = useAIChatStore((s) => s.messages)
  const lastUndoState = useAIChatStore((s) => s.lastUndoState)

  const toggleOpen = useAIChatStore((s) => s.toggleOpen)
  const toggleMinimize = useAIChatStore((s) => s.toggleMinimize)
  const setMode = useAIChatStore((s) => s.setMode)
  const clearMessages = useAIChatStore((s) => s.clearMessages)
  const sendMessage = useAIChatStore((s) => s.sendMessage)
  const applyRecommendation = useAIChatStore((s) => s.applyRecommendation)
  const applyAllRecommendations = useAIChatStore((s) => s.applyAllRecommendations)
  const undoLastModifications = useAIChatStore((s) => s.undoLastModifications)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const MODES: { id: ChatMode; label: string }[] = [
    { id: 'GENERAL', label: 'General' },
    { id: 'ANALYSIS', label: 'Spacecraft' },
    { id: 'PLANNING', label: 'Planning' },
    { id: 'TROUBLESHOOTING', label: 'Fix Errors' },
    { id: 'OPTIMIZATION', label: 'Optimizer' },
    { id: 'FAILURE_ANALYSIS', label: 'Failure RCA' },
  ]

  return (
    <>
      {/* 1. Floating AI Assistant Launch Button (Fixed Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleOpen}
          className="relative group flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl panel-surface !bg-bg-elevated/90 text-text-primary backdrop-blur-xl cursor-pointer hover:!border-accent-blue/40 transition-colors"
          aria-label="Open ORBIT-X AI Mission Engineering Assistant"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-blue/15 text-accent-blue">
            <Bot className="h-4 w-4" />
          </span>
          <span className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-[12.5px] font-medium">Ask flight engineer</span>
            <span className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-status-success" /> AI online
            </span>
          </span>
          <Sparkles className="h-3.5 w-3.5 text-text-muted transition-transform group-hover:rotate-12 group-hover:text-accent-blue" />
        </motion.button>
      </div>

      {/* 2. Interactive AI Assistant Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : '580px',
            }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[460px] max-w-[480px] panel-surface !bg-bg-panel/95 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="p-3.5 px-4 border-b border-white/10 bg-bg-secondary/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center text-accent-cyan">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-xs font-bold text-text-primary tracking-wide">
                      ORBIT-X AI
                    </h3>
                    <Badge variant="success" className="text-[9px] py-0 px-1.5 font-mono">
                      ONLINE
                    </Badge>
                  </div>
                  <p className="text-[10px] text-text-muted">Mission Engineering Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {lastUndoState && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={undoLastModifications}
                    className="h-7 w-7 text-amber-400 hover:text-amber-300"
                    title="Undo AI Component Modifications"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  className="h-7 w-7 text-text-muted hover:text-text-primary"
                  title="Clear Conversation"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMinimize}
                  className="h-7 w-7 text-text-muted hover:text-text-primary"
                  title={isMinimized ? 'Expand Chatbot' : 'Minimize Chatbot'}
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleOpen}
                  className="h-7 w-7 text-text-muted hover:text-text-primary"
                  title="Close Assistant"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Mode Selector Tabs */}
                <div className="px-3 py-1.5 border-b border-white/5 bg-bg-elevated/40 flex items-center gap-1 overflow-x-auto text-[10px] font-mono no-scrollbar">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`px-2 py-1 rounded whitespace-nowrap transition-colors ${
                        activeMode === m.id
                          ? 'bg-accent-blue text-white font-bold'
                          : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Conversation Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                  {messages.map((msg) => {
                    const isUser = msg.sender === 'user'
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-xl p-3 leading-relaxed ${
                            isUser
                              ? 'bg-accent-blue text-white rounded-tr-none'
                              : 'bg-bg-elevated border border-white/10 text-text-primary rounded-tl-none shadow-sm'
                          }`}
                        >
                          <div className="whitespace-pre-line text-xs font-sans">
                            {msg.content}
                          </div>

                          {/* Structured Actionable Recommendations */}
                          {msg.recommendations && msg.recommendations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-accent-cyan font-bold uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3" />
                                  Actionable Modifications ({msg.recommendations.length})
                                </span>
                                {!msg.applied && (
                                  <Button
                                    size="sm"
                                    onClick={() => applyAllRecommendations(msg.id)}
                                    className="h-6 text-[10px] px-2 bg-accent-blue hover:bg-accent-blue/90 font-mono"
                                  >
                                    Apply All
                                  </Button>
                                )}
                              </div>

                              {msg.recommendations.map((rec, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="p-2 rounded bg-bg-secondary/70 border border-white/5 flex flex-col gap-1 text-[11px] font-mono"
                                >
                                  <div className="flex items-center justify-between text-text-primary font-bold">
                                    <span className="capitalize text-accent-cyan">
                                      {rec.action.replace('_', ' ')}: {rec.recommendedComponentId}
                                    </span>
                                    {!msg.applied ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyRecommendation(msg.id, rIdx)}
                                        className="h-5 text-[9px] px-1.5 text-accent-blue border-accent-blue/30"
                                      >
                                        Apply
                                      </Button>
                                    ) : (
                                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Applied
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-text-muted">{rec.reason}</p>
                                  {rec.estimatedImpact && (
                                    <div className="flex items-center gap-2 text-[9px] text-text-secondary mt-0.5">
                                      {rec.estimatedImpact.powerDeltaWatts !== undefined && (
                                        <span>Power: {rec.estimatedImpact.powerDeltaWatts > 0 ? '+' : ''}{rec.estimatedImpact.powerDeltaWatts}W</span>
                                      )}
                                      {rec.estimatedImpact.massDeltaKg !== undefined && (
                                        <span>Mass: {rec.estimatedImpact.massDeltaKg > 0 ? '+' : ''}{rec.estimatedImpact.massDeltaKg}kg</span>
                                      )}
                                      {rec.estimatedImpact.deltaVDeltaMps !== undefined && (
                                        <span>&Delta;v: {rec.estimatedImpact.deltaVDeltaMps > 0 ? '+' : ''}{rec.estimatedImpact.deltaVDeltaMps}m/s</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick Prompts Suggestions */}
                        {msg.suggestions && msg.suggestions.length > 0 && !isUser && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.suggestions.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => sendMessage(sug)}
                                className="text-[10px] font-mono px-2 py-1 rounded-full bg-white/5 hover:bg-accent-blue/20 text-accent-cyan border border-white/5 hover:border-accent-cyan/30 transition-all cursor-pointer"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                        <span className="text-[9px] font-mono text-text-muted mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )
                  })}

                  {isLoading && (
                    <div className="flex items-center gap-2 p-3 bg-bg-elevated border border-white/5 rounded-xl w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] font-mono text-text-muted ml-1">
                        Analyzing spacecraft telemetry...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Tray */}
                <div className="p-3 border-t border-white/10 bg-bg-secondary/90 flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask ORBIT-X AI about spacecraft systems, delta-v, or failures..."
                    rows={1}
                    className="flex-1 bg-bg-elevated border border-white/10 rounded-xl p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan resize-none max-h-24 leading-relaxed font-sans"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="h-9 w-9 rounded-xl bg-accent-blue hover:bg-accent-blue/90 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
