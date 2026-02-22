/**
 * Example: Integrating useToast hookinto AdminUsersTab
 *
 * This file shows the pattern for converting from inline Sonner usage
 * to the centralized useToast hook.
 */

"use client";

import { useState } from "react";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { User } from "@/types/user";

export function AdminUsersTabExample() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * CREATE - Add new user
   * Pattern: Show create success toast
   */
  const handleCreateUser = async (formData: Partial<User>) => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }

      const newUser = await response.json();
      setUsers([...users, newUser]);

      // Toast for successful creation
      toast.create(`User ${newUser.fullName} created successfully`);

      // Reset form would happen here
    } catch (error) {
      // Use helper to extract error message
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * UPDATE - Edit existing user
   * Pattern: Show update success toast
   */
  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/user/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user");
      }

      const updatedUser = await response.json();
      setUsers(users.map((u) => (u._id === userId ? updatedUser : u)));

      // Toast for successful update
      toast.update(`User ${updatedUser.fullName} updated successfully`);

      // Close edit modal would happen here
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  /**
   * DELETE - Remove user
   * Pattern: Show delete success toast, use promise for async
   */
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }

      setUsers(users.filter((u) => u._id !== userId));

      // Toast for successful deletion
      toast.delete(`User ${userName} deleted successfully`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  /**
   * ASYNC OPERATION - Bulk import users
   * Pattern: Use toast.promise for long-running tasks
   */
  const handleBulkImport = async (file: File) => {
    const uploadPromise = fetch("/api/user/bulk-import", {
      method: "POST",
      body: new FormData().append("file", file),
    }).then((res) => {
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    });

    await toast.promise(uploadPromise, {
      loading: "Importing users...",
      success: (data) => `${data.count} users imported successfully`,
      error: (err) => getErrorMessage(err),
    });

    // Refresh user list
    // refreshUserList();
  };

  /**
   * SEARCH/FILTER - Show loading while searching
   * Pattern: Use separate loading and result toasts
   */
  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) return;

    const loadingToastId = toast.loading(`Searching for "${query}"...`);

    try {
      const response = await fetch(`/api/user/search?q=${query}`);

      if (!response.ok) throw new Error("Search failed");

      const results = await response.json();

      // Dismiss loading toast and show result
      toast.dismiss(loadingToastId);
      toast.info(`Found ${results.length} matching users`);

      setUsers(results);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getErrorMessage(error));
    }
  };

  /**
   * ASYNC EXPORT - Export users to Excel
   * Pattern: Promise-based with specific messages
   */
  const handleExportUsers = async () => {
    const exportPromise = fetch("/api/user/export", {
      method: "GET",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "users.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
      });

    await toast.promise(exportPromise, {
      loading: "Exporting users...",
      success: "Users exported successfully",
      error: "Failed to export users",
    });
  };

  /**
   * BATCH OPERATIONS - Multiple operations
   * Pattern: Show completion toast after batch processing
   */
  const handleBatchStatusUpdate = async (
    userIds: string[],
    newRole: string,
  ) => {
    try {
      const response = await fetch("/api/user/batch-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, role: newRole }),
      });

      if (!response.ok) throw new Error("Batch update failed");

      // Show success with count
      toast.update(`Role updated for ${userIds.length} users`);

      // Refresh user list
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // JSX Example
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Users Management</h2>

      <div className="flex gap-2">
        <button
          onClick={() =>
            handleCreateUser({
              fullName: "New User",
              email: "user@example.com",
            })
          }
          disabled={isCreating}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add User
        </button>

        <button
          onClick={() => handleExportUsers()}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Export Users
        </button>
      </div>

      {/* User list would render here */}
      <div className="border rounded p-4">
        {users.length === 0 ? (
          <p className="text-gray-500">No users found</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user._id}
                className="flex justify-between items-center p-2 border rounded"
              >
                <span>
                  {user.fullName} ({user.email})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleUpdateUser(user._id!, { fullName: "Updated Name" })
                    }
                    className="text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user._id!, user.fullName)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * INTEGRATION CHECKLIST:
 *
 * ✓ Import useToast and getErrorMessage from "@/lib/useToast"
 * ✓ Call const toast = useToast() at component start
 * ✓ Remove any "import { toast } from 'sonner'"
 * ✓ Replace toast.success() with toast.create()
 * ✓ Replace toast.error() with toast.error() (same but centralized)
 * ✓ Use getErrorMessage(error) for consistent error formatting
 * ✓ Use toast.promise() for long operations
 * ✓ Use toast.loading() and toast.dismiss() for manual control
 *
 * COMMON PATTERNS:
 * - Create: toast.create("Item created")
 * - Update: toast.update("Item updated")
 * - Delete: toast.delete("Item deleted")
 * - Error: toast.error(getErrorMessage(error))
 * - Async: await toast.promise(promise, { loading, success, error })
 * - Loading: const id = toast.loading("Working..."); then toast.dismiss(id)
 */
