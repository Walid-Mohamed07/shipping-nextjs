import { toast } from "sonner";

type ToastType = "success" | "error" | "loading" | "info";

interface ToastOptions {
  duration?: number;
  description?: string;
}

/**
 * Centralized hook for consistent toast notifications across the project
 * Used for CRUD operations and user feedback
 */
export const useToast = () => {
  const showToast = (
    message: string,
    type: ToastType = "success",
    options?: ToastOptions,
  ) => {
    const config = { duration: options?.duration || 3000 };

    switch (type) {
      case "success":
        toast.success(message, config);
        break;
      case "error":
        toast.error(message, config);
        break;
      case "loading":
        toast.loading(message, config);
        break;
      case "info":
        toast.info(message, config);
        break;
      default:
        toast.message(message, config);
    }
  };

  return {
    /**
     * Show success toast for create operations
     * @example toast.create("User created successfully")
     */
    create: (message: string = "Created successfully") => {
      showToast(message, "success", { duration: 3000 });
    },

    /**
     * Show success toast for update operations
     * @example toast.update("User updated successfully")
     */
    update: (message: string = "Updated successfully") => {
      showToast(message, "success", { duration: 3000 });
    },

    /**
     * Show success toast for delete operations
     * @example toast.delete("User deleted successfully")
     */
    delete: (message: string = "Deleted successfully") => {
      showToast(message, "success", { duration: 3000 });
    },

    /**
     * Show error toast
     * @example toast.error("Failed to create user")
     */
    error: (message: string = "An error occurred", options?: ToastOptions) => {
      showToast(message, "error", { duration: options?.duration || 4000 });
    },

    /**
     * Show loading toast
     * @example const id = toast.loading("Loading...")
     */
    loading: (message: string = "Loading...") => {
      return toast.loading(message);
    },

    /**
     * Show info toast
     * @example toast.info("This is an informational message")
     */
    info: (message: string) => {
      showToast(message, "info", { duration: 3000 });
    },

    /**
     * Show warning toast (using error styling)
     * @example toast.warning("Are you sure?")
     */
    warning: (message: string) => {
      showToast(message, "error", { duration: 4000 });
    },

    /**
     * Dismiss a specific toast
     * @example toast.dismiss(toastId)
     */
    dismiss: (id?: string | number) => {
      if (id) {
        toast.dismiss(id);
      } else {
        toast.dismiss();
      }
    },

    /**
     * Generic toast method for custom messages
     * @example toast.custom("Custom message", "success")
     */
    custom: (message: string, type: ToastType = "info") => {
      showToast(message, type);
    },

    /**
     * Promise-based toast for async operations
     * @example await toast.promise(apiCall(), "Creating...", "Created!", "Failed")
     */
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      },
    ) => {
      return toast.promise(promise, messages);
    },
  };
};

/**
 * Helper function to get error message from API response or Error object
 * @example const msg = getErrorMessage(error)
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return "An error occurred";

  if (typeof error === "string") return error;

  if (error.response?.data?.error) return error.response.data.error;
  if (error.message) return error.message;

  return "An unexpected error occurred";
};
