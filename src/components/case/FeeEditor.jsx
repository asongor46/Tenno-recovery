import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, Lock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function FeeEditor({ caseData }) {
  const [selectedFee, setSelectedFee] = useState(caseData.fee_percent || 20);
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const calculateFeeMutation = useMutation({
    mutationFn: () => base44.functions.invoke("smartFeeEngine", { case_id: caseData.id }),
    onSuccess: ({ data }) => {
      toast.success(`Recommended fee: ${data.recommended_fee_percent}%`);
      setSelectedFee(data.recommended_fee_percent);
      queryClient.invalidateQueries({ queryKey: ["case", caseData.id] });
    },
    onError: () => toast.error("Failed to calculate fee")
  });

  const updateFeeMutation = useMutation({
    mutationFn: (newFee) => base44.entities.Case.update(caseData.id, { fee_percent: newFee }),
    onSuccess: () => {
      toast.success("Fee updated successfully");
      queryClient.invalidateQueries({ queryKey: ["case", caseData.id] });
    },
    onError: () => toast.error("Failed to update fee")
  });

  const isLocked = caseData.fee_locked || caseData.agreement_status === "signed";
  const hasRecommendation = !!caseData.recommended_fee_percent;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Fee Structure
          {isLocked && (
            <Badge className="bg-amber-500/10 text-amber-400 border-0 ml-auto">
              <Lock className="w-3 h-3 mr-1" /> Locked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Fee */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Current Fee</p>
              <p className="text-3xl font-bold text-white">{caseData.fee_percent || 20}%</p>
              <p className="text-sm text-slate-400 mt-1">
                ${((caseData.surplus_amount || 0) * ((caseData.fee_percent || 20) / 100)).toLocaleString()}
              </p>
            </div>
            {hasRecommendation && (
              <div className="text-right">
                <p className="text-sm text-slate-400">Recommended</p>
                <Badge className="bg-purple-500/10 text-purple-400 border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {caseData.recommended_fee_percent}%
                </Badge>
              </div>
            )}
          </div>
        </div>

        {!isLocked && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Override Fee Percentage</label>
              <Select value={selectedFee.toString()} onValueChange={(val) => setSelectedFee(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15% - Simple/High Value</SelectItem>
                  <SelectItem value="20">20% - Standard</SelectItem>
                  <SelectItem value="25">25% - Complex</SelectItem>
                  <SelectItem value="30">30% - High Complexity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => calculateFeeMutation.mutate()}
                disabled={calculateFeeMutation.isPending}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {calculateFeeMutation.isPending ? "Calculating..." : "Calculate Smart Fee"}
              </Button>
              <Button
                onClick={() => updateFeeMutation.mutate(selectedFee)}
                disabled={updateFeeMutation.isPending || selectedFee === caseData.fee_percent}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Update Fee
              </Button>
            </div>
          </>
        )}

        {isLocked && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              Fee is locked after agreement signature. Contact support to modify.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}