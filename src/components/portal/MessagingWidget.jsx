import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  User,
  UserCircle
} from "lucide-react";
import { format } from "date-fns";

/**
 * ADDED: Secure Messaging Widget
 * Real-time communication between client and agent
 */
export default function MessagingWidget({ caseId, clientName }) {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["portal-messages", caseId],
    queryFn: () => base44.entities.PortalMessage.filter({ case_id: caseId }, "-created_date"),
    enabled: !!caseId,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (messageData) => base44.entities.PortalMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries(["portal-messages", caseId]);
      setMessage("");
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessage.mutate({
      case_id: caseId,
      sender_type: "client",
      sender_name: clientName,
      message: message.trim(),
    });
  };

  const unreadCount = messages.filter(m => m.sender_type === "agent" && !m.is_read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages
          </CardTitle>
          {unreadCount > 0 && (
            <Badge className="bg-blue-500">{unreadCount} new</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender_type === "client" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender_type !== "client" && (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_type === "client"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="text-xs opacity-70 mb-1">
                    {msg.sender_name || "Agent"} • {format(new Date(msg.created_date), "MMM d, h:mm a")}
                  </p>
                  <p className="text-sm">{msg.message}</p>
                </div>
                {msg.sender_type === "client" && (
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Send Message */}
        <div className="space-y-2 pt-3 border-t">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMessage.isPending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}