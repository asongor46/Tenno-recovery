import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Loader2, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * HOMEOWNER CHATBOT - "HomeSmart AI"
 * Scope: Read-only + guided actions
 * Cannot modify case logic
 * Cannot give legal advice
 */

export default function HomeownerChatbot({ caseId, caseData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm HomeSmart AI, your personal assistant. I can help you understand your case status, explain next steps, and answer questions. How can I help you today?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Call AI with case context
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are HomeSmart AI, a helpful assistant for homeowners recovering surplus funds.

CONTEXT:
- Case Number: ${caseData.case_number}
- Owner: ${caseData.owner_name}
- County: ${caseData.county}, ${caseData.state}
- Surplus Amount: $${caseData.surplus_amount?.toLocaleString() || "0"}
- Current Stage: ${caseData.stage}
- Agreement Status: ${caseData.agreement_status || "not_sent"}
- Notary Status: ${caseData.notary_status || "pending"}

RULES:
1. You are friendly and helpful
2. You CANNOT modify case data or make decisions
3. You CANNOT give legal advice
4. You CAN explain status, next steps, and procedures
5. You CAN tell them what documents to upload
6. For complex issues, suggest they contact support
7. Keep responses under 100 words

USER QUESTION: ${userMessage}

Provide a helpful, context-aware response.`,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble right now. Please contact support at support@tennorecovery.com or call (555) 123-4567." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "What's my status?", value: "What is the current status of my case?" },
    { label: "What do I do next?", value: "What are my next steps?" },
    { label: "When will I get paid?", value: "When will I receive my surplus funds?" },
    { label: "Upload help", value: "What documents do I need to upload?" }
  ];

  const handleQuickAction = (value) => {
    setInput(value);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full shadow-lg bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </Button>
        </motion.div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] z-50"
          >
            <Card className="shadow-2xl border-purple-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">HomeSmart AI</p>
                    <p className="text-xs text-purple-100">Always here to help</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages */}
              <CardContent className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-lg p-3 ${
                      msg.role === "user" 
                        ? "bg-purple-600 text-white" 
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="bg-slate-100 rounded-lg p-3">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Quick Actions */}
              {messages.length === 1 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-slate-500 mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 text-xs"
                        onClick={() => handleQuickAction(action.value)}
                      >
                        {action.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  For urgent matters: support@tennorecovery.com
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}