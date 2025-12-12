import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckSquare,
  Mail,
  FileText,
  Archive,
  Trash2,
  MoreVertical,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";
import { motion, AnimatePresence } from "framer-motion";

/**
 * BULK ACTIONS TOOLBAR - Step 11
 * Multi-select cases, batch operations with progress
 */

export default function BulkActionsToolbar({ selectedCases, onClearSelection }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, action: "" });
  const [results, setResults] = useState({ success: 0, failed: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const handleBulkAction = async (action) => {
    setConfirmAction(action);
    setShowConfirm(true);
  };

  const executeBulkAction = async () => {
    setShowConfirm(false);
    setIsProcessing(true);
    setProgress({ current: 0, total: selectedCases.length, action: confirmAction.label });
    setResults({ success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedCases.length; i++) {
      const caseItem = selectedCases[i];
      setProgress({ current: i + 1, total: selectedCases.length, action: confirmAction.label });

      try {
        switch (confirmAction.id) {
          case 'send_portal':
            await base44.functions.invoke('generatePortalLink', {
              case_id: caseItem.id,
              send_email: true
            });
            break;
          case 'generate_agreement':
            await base44.functions.invoke('generateAgreement', {
              case_id: caseItem.id,
              send_email: false
            });
            break;
          case 'archive':
            await base44.entities.Case.update(caseItem.id, {
              status: 'archived'
            });
            break;
          case 'delete':
            await base44.entities.Case.delete(caseItem.id);
            break;
        }
        successCount++;
      } catch (error) {
        console.error(`Failed for case ${caseItem.case_number}:`, error);
        failedCount++;
      }
    }

    setResults({ success: successCount, failed: failedCount });
    setIsProcessing(false);

    queryClient.invalidateQueries({ queryKey: ['cases'] });
    
    if (successCount > 0) {
      toast.success(`${confirmAction.label} completed: ${successCount} succeeded, ${failedCount} failed`);
    }

    setTimeout(() => {
      onClearSelection();
      setProgress({ current: 0, total: 0, action: "" });
      setResults({ success: 0, failed: 0 });
    }, 3000);
  };

  const actions = [
    {
      id: 'send_portal',
      label: 'Send Portal Links',
      icon: Mail,
      description: 'Send portal access emails to homeowners',
      dangerous: false
    },
    {
      id: 'generate_agreement',
      label: 'Generate Agreements',
      icon: FileText,
      description: 'Generate agreement documents for all selected cases',
      dangerous: false
    },
    {
      id: 'archive',
      label: 'Archive Cases',
      icon: Archive,
      description: 'Move cases to archived status',
      dangerous: true
    },
    {
      id: 'delete',
      label: 'Delete Cases',
      icon: Trash2,
      description: 'Permanently delete cases and all related data',
      dangerous: true
    }
  ];

  if (selectedCases.length === 0 && !isProcessing) return null;

  return (
    <>
      <AnimatePresence>
        {(selectedCases.length > 0 || isProcessing) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[500px]">
              {isProcessing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{progress.action}</p>
                      <p className="text-sm text-slate-500">
                        Processing {progress.current} of {progress.total} cases...
                      </p>
                    </div>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  </div>
                  <Progress 
                    value={(progress.current / progress.total) * 100} 
                    className="h-2"
                  />
                  {results.success > 0 && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        {results.success} succeeded
                      </div>
                      {results.failed > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          {results.failed} failed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {selectedCases.length} selected
                    </Badge>
                    <div className="h-6 w-px bg-slate-200" />
                    <p className="text-sm text-slate-600">Bulk Actions:</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {actions.slice(0, 2).map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction(action)}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {action.label}
                        </Button>
                      );
                    })}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.slice(2).map((action) => {
                          const Icon = action.icon;
                          return (
                            <DropdownMenuItem
                              key={action.id}
                              onClick={() => handleBulkAction(action)}
                              className={action.dangerous ? "text-red-600" : ""}
                            >
                              <Icon className="w-4 h-4 mr-2" />
                              {action.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-6 w-px bg-slate-200" />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearSelection}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {confirmAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
              <br /><br />
              This action will affect <strong>{selectedCases.length}</strong> case(s).
              {confirmAction?.dangerous && (
                <span className="text-red-600 font-semibold">
                  <br />⚠️ This action cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={confirmAction?.dangerous ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}