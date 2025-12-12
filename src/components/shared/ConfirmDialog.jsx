import React from "react";
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
import { AlertCircle } from "lucide-react";

/**
 * Reusable confirmation dialog
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default" // default, destructive
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {variant === "destructive" && (
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * useConfirm hook for easier usage
 */
export function useConfirm() {
  const [config, setConfig] = React.useState({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const confirm = (options) => {
    return new Promise((resolve) => {
      setConfig({
        open: true,
        ...options,
        onConfirm: () => {
          resolve(true);
          setConfig(prev => ({ ...prev, open: false }));
        },
      });
    });
  };

  const ConfirmComponent = () => (
    <ConfirmDialog
      open={config.open}
      onOpenChange={(open) => setConfig(prev => ({ ...prev, open }))}
      {...config}
    />
  );

  return { confirm, ConfirmComponent };
}