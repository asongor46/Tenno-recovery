import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Target, Loader2, CheckCircle } from "lucide-react";

export default function RunVerificationButton({ caseId, variant = "outline", size = "default" }) {
  const [isRunning, setIsRunning] = useState(false);
  const queryClient = useQueryClient();

  const runVerification = async () => {
    setIsRunning(true);

    const { data } = await base44.functions.invoke("runCaseVerification", {
      case_id: caseId,
    });

    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    setIsRunning(false);

    if (data.status === "success") {
      alert(`Verification complete: ${data.verification.summary}`);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={runVerification}
      disabled={isRunning}
    >
      {isRunning ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Target className="w-4 h-4 mr-2" />
      )}
      {isRunning ? "Verifying..." : "Run Verification"}
    </Button>
  );
}