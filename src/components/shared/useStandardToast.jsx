import { toast } from "sonner";

/**
 * Standardized toast notifications across the app
 * Replaces all alert() calls with consistent UX
 */
export const useStandardToast = () => {
  return {
    success: (message, options = {}) => {
      toast.success(message, {
        duration: 3000,
        ...options,
      });
    },

    error: (message, options = {}) => {
      toast.error(message, {
        duration: 5000,
        ...options,
      });
    },

    warning: (message, options = {}) => {
      toast.warning(message, {
        duration: 4000,
        ...options,
      });
    },

    info: (message, options = {}) => {
      toast.info(message, {
        duration: 3000,
        ...options,
      });
    },

    promise: (promise, messages) => {
      return toast.promise(promise, {
        loading: messages.loading || "Processing...",
        success: messages.success || "Success!",
        error: messages.error || "Failed",
      });
    },

    background: (message, options = {}) => {
      toast.info(message, {
        duration: 2000,
        position: "bottom-right",
        ...options,
      });
    },
  };
};

export default useStandardToast;