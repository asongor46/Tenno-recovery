// [NEW - Client AI Assistant for Portal]
import React from "react";
import AIAssistantChat from "@/components/ai/AIAssistantChat";

export default function ClientAIAssistant({ caseId = null, userEmail = null }) {
  return (
    <AIAssistantChat 
      userType="client"
      userId={userEmail}
      caseId={caseId}
      position="floating"
    />
  );
}