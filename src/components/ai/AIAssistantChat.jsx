// [NEW - AI Assistant Chat Component]
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Minus, Send, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistantChat({ 
  userType = 'client', 
  caseId = null,
  userId = null,
  position = 'floating',
  defaultOpen = false 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [sessionId] = useState(() => 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendInitialGreeting();
    }
  }, [isOpen]);
  
  const sendInitialGreeting = async () => {
    setIsLoading(true);
    try {
      const { data } = await base44.functions.invoke('processAIMessage', {
        message: 'hello',
        userType,
        userId,
        caseId,
        sessionId,
        conversationId
      });
      
      if (data.success) {
        setMessages([{
          role: 'assistant',
          content: data.response.text,
          actions: data.response.suggestedActions,
          followUps: data.response.followUpPrompts,
          timestamp: new Date()
        }]);
        setConversationId(data.response.conversationId);
      }
    } catch (error) {
      console.error('AI error:', error);
      setMessages([{
        role: 'assistant',
        content: getDefaultGreeting(userType),
        actions: getDefaultActions(userType),
        followUps: [],
        timestamp: new Date()
      }]);
    }
    setIsLoading(false);
  };
  
  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const { data } = await base44.functions.invoke('processAIMessage', {
        message: messageText,
        userType,
        userId,
        caseId,
        sessionId,
        conversationId
      });
      
      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response.text,
          actions: data.response.suggestedActions,
          followUps: data.response.followUpPrompts,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(data.response.conversationId);
        
        if (data.response.escalate) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              role: 'system',
              content: 'Connecting you with a team member...',
              timestamp: new Date()
            }]);
          }, 1000);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact us directly.',
        timestamp: new Date()
      }]);
    }
    
    setIsLoading(false);
    inputRef.current?.focus();
  };
  
  const handleActionClick = (action) => {
    if (action.action === 'message') {
      handleSendMessage(action.route);
    } else if (action.action === 'navigate') {
      window.location.href = action.route;
    } else if (action.action === 'escalate') {
      handleSendMessage('talk to a person');
    }
  };
  
  const getDefaultGreeting = (type) => {
    return type === 'client' 
      ? "Hello! 👋 I'm your Recovery Guide. I can help you check your status, understand the process, and answer questions.\n\nWhat would you like to know?"
      : "Hello! I'm your Case Analyst. I can help with case briefings, scripts, and analysis.\n\nWhat would you like to work on?";
  };
  
  const getDefaultActions = (type) => {
    return type === 'client'
      ? [{ label: 'Check My Status', action: 'message', route: 'What\'s my case status?', primary: true }]
      : [{ label: 'Brief Me', action: 'message', route: 'Brief me on this case', primary: true }];
  };
  
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[85%] rounded-lg p-3 ${
          isUser ? 'bg-teal-600 text-white' :
          isSystem ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' :
          'bg-slate-700 text-slate-100'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {!isUser && <Bot className="w-4 h-4 text-teal-400" />}
            <span className="text-xs opacity-70">
              {isUser ? 'You' : isSystem ? 'System' : 'AI Assistant'}
            </span>
          </div>
          
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
          
          {message.actions?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.actions.map((action, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={action.primary ? 'default' : 'outline'}
                  onClick={() => handleActionClick(action)}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          {message.followUps?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <p className="text-xs opacity-70 mb-2">Quick questions:</p>
              {message.followUps.map((followUp, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(followUp)}
                  className="block text-left text-xs text-teal-400 hover:text-teal-300 hover:underline mb-1"
                >
                  • {followUp}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  if (position === 'floating' && !isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-5 right-5 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-teal-600 hover:bg-teal-700 shadow-lg"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }
  
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-5 right-5 z-50 bg-slate-800 rounded-lg shadow-xl cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2 p-3">
          <Bot className="w-5 h-5 text-teal-400" />
          <span className="text-white text-sm">AI Assistant</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`${position === 'floating' ? 'fixed bottom-5 right-5 z-50' : ''} w-96 max-w-[calc(100vw-2rem)]`}
      >
        <Card className="bg-slate-800 border-slate-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Recovery Guide</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(true)}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 bg-slate-900">
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-slate-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                    <span className="text-sm text-slate-300">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}