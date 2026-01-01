import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStandardToast } from "@/components/shared/useStandardToast";

/**
 * AGENT CHATBOT - "AgentAssist AI"
 * Natural language → system router → trusted functions
 * Can query cases, trigger actions, generate documents, suggest next steps, batch operations
 * Routes commands to EXISTING backend functions
 */

export default function AgentChatbot() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });
  
  return (
    <AIAssistantChat 
      userType="agent"
      userId={user?.id}
      position="floating"
    />
  );
}

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm AgentAssist AI. I can help you query cases, trigger actions, generate documents, and run batch operations. Try asking me things like:

• "Show me all hot cases"
• "Find cases needing notary"
• "Generate agreement for case #12345"
• "What should I do next for case #12345?"

How can I help you?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const toast = useStandardToast();

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
      // AI determines intent and routes to appropriate function
      const intentResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are AgentAssist AI, an intelligent routing system for case management.

USER REQUEST: "${userMessage}"

Analyze the request and determine the intent. Respond with JSON:

{
  "intent": "query_cases" | "trigger_action" | "generate_document" | "suggest_steps" | "batch_operation" | "general_help",
  "action": "specific function or operation to perform",
  "parameters": { /* extracted parameters */ },
  "explanation": "brief explanation of what you'll do"
}

EXAMPLES:
- "Show me hot cases" → {"intent": "query_cases", "action": "filter_hot_cases", "parameters": {}}
- "Generate agreement for case #12345" → {"intent": "generate_document", "action": "generateAgreement", "parameters": {"case_number": "12345"}}
- "Find cases needing notary" → {"intent": "query_cases", "action": "filter_by_notary_status", "parameters": {"notary_status": "pending"}}`,
        response_json_schema: {
          type: "object",
          properties: {
            intent: { type: "string" },
            action: { type: "string" },
            parameters: { type: "object" },
            explanation: { type: "string" }
          }
        }
      });

      const intent = intentResponse;

      // Add explanation message
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: intent.explanation,
        type: "thinking"
      }]);

      // Execute the action
      let result = await executeAction(intent);

      // Add result message
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: result.message,
        type: result.type || "result",
        data: result.data
      }]);

      if (result.success) {
        toast.success(result.toast || "Action completed");
      }

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `I encountered an error: ${error.message}. Please try rephrasing your request or contact support.`,
        type: "error"
      }]);
      toast.error("Failed to process request");
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (intent) => {
    switch (intent.intent) {
      case "query_cases":
        return await queryCase(intent.action, intent.parameters);
      
      case "trigger_action":
        return await triggerAction(intent.action, intent.parameters);
      
      case "generate_document":
        return await generateDocument(intent.action, intent.parameters);
      
      case "suggest_steps":
        return await suggestSteps(intent.parameters);
      
      default:
        return {
          success: true,
          message: "I can help you with queries, actions, documents, and suggestions. What would you like to do?",
          type: "help"
        };
    }
  };

  const queryCase = async (action, params) => {
    let cases = [];
    
    if (action === "filter_hot_cases") {
      cases = await base44.entities.Case.filter({ is_hot: true });
    } else if (action === "filter_by_notary_status") {
      cases = await base44.entities.Case.filter({ notary_status: params.notary_status || "pending" });
    } else if (action === "filter_by_stage") {
      cases = await base44.entities.Case.filter({ stage: params.stage });
    } else if (params.case_number) {
      cases = await base44.entities.Case.filter({ case_number: params.case_number });
    } else {
      cases = await base44.entities.Case.list("-updated_date", 10);
    }

    return {
      success: true,
      message: `Found ${cases.length} case(s). ${cases.slice(0, 3).map(c => `\n• ${c.case_number} - ${c.owner_name} ($${c.surplus_amount?.toLocaleString()})`).join("")}`,
      type: "query_result",
      data: cases,
      toast: `Found ${cases.length} cases`
    };
  };

  const triggerAction = async (action, params) => {
    // Route to existing backend functions
    let result;
    
    if (action === "classifyCase") {
      result = await base44.functions.invoke("classifyCase", params);
    } else if (action === "runVerification") {
      result = await base44.functions.invoke("runCaseVerification", params);
    } else if (action === "sendPortalLink") {
      result = await base44.functions.invoke("generatePortalLink", { 
        ...params, 
        send_email: true 
      });
    }

    return {
      success: true,
      message: `Action completed: ${action}`,
      type: "action_result",
      data: result?.data,
      toast: "Action executed"
    };
  };

  const generateDocument = async (action, params) => {
    // Find case by case number
    const cases = await base44.entities.Case.filter({ case_number: params.case_number });
    if (cases.length === 0) {
      return {
        success: false,
        message: `Case ${params.case_number} not found`,
        type: "error"
      };
    }

    const result = await base44.functions.invoke("generateAgreement", {
      case_id: cases[0].id,
      send_email: false
    });

    return {
      success: true,
      message: `Agreement generated for ${params.case_number}. Fee: ${result.data.fee_amount}`,
      type: "document_result",
      data: result.data,
      toast: "Document generated"
    };
  };

  const suggestSteps = async (params) => {
    const result = await base44.functions.invoke("aiCaseAutomation", {
      case_id: params.case_id,
      action_type: "suggest_next_steps"
    });

    const steps = result.data.result.next_steps || [];
    
    return {
      success: true,
      message: `Here are ${steps.length} suggested next steps:\n${steps.map((s, i) => `\n${i+1}. ${s.action} (${s.priority})`).join("")}`,
      type: "suggestion_result",
      data: steps,
      toast: "Suggestions generated"
    };
  };

  const quickCommands = [
    { label: "Hot Cases", value: "Show me all hot cases" },
    { label: "Needs Notary", value: "Find cases needing notary" },
    { label: "Recent Activity", value: "Show recently updated cases" }
  ];

  return (
    <>
      {/* Floating Button - Mobile optimized */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-4 right-16 sm:bottom-6 sm:right-24 z-40"
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </Button>
        </motion.div>
      )}

      {/* Chat Window - Mobile responsive */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-2 left-2 sm:bottom-6 sm:right-24 sm:left-auto sm:w-[480px] z-40"
          >
            <Card className="shadow-2xl border-indigo-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">AgentAssist AI</p>
                    <p className="text-xs text-indigo-100">Your intelligent assistant</p>
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
              <CardContent className="h-[400px] sm:h-[500px] overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {msg.type === "thinking" ? (
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        ) : msg.type === "result" || msg.type === "action_result" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Bot className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white" 
                        : msg.type === "error"
                        ? "bg-red-50 text-red-900 border border-red-200"
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    </div>
                    <div className="bg-slate-100 rounded-lg p-3">
                      <p className="text-sm text-slate-600">Processing...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Quick Commands */}
              {messages.length === 1 && (
                <div className="px-3 sm:px-4 pb-2">
                  <p className="text-xs text-slate-500 mb-2">Quick commands:</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {quickCommands.map((cmd, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 text-xs"
                        onClick={() => setInput(cmd.value)}
                      >
                        {cmd.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 sm:p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask me to do something..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}