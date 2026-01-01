// [REPLACED - Now uses custom AI engine]
import React from "react";
import AIAssistantChat from "@/components/ai/AIAssistantChat";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

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