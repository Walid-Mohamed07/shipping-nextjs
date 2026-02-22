"use client";

import React from "react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Edit2,
  Plus,
  User as UserIcon,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { type User } from "@/types";
import ProfilePictureUpload from "@/app/components/ProfilePictureUpload";
import { useToast, getErrorMessage } from "@/lib/useToast";

export function AdminUsersTab() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "date" | "role">("name");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    mobile: "",
    birthDate: "",
    status: "active" as "active" | "inactive" | "suspended",
    role: "client" as "client" | "admin" | "operator" | "company" | "driver",
    assignedCompanyId: "" as string,
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch companies when form is shown or role changes to "company"
  useEffect(() => {
    if (showForm && formData.role === "company") {
      const fetchCompanies = async () => {
        setLoadingCompanies(true);
        try {
          const res = await fetch("/api/admin/companies");
          if (!res.ok) throw new Error("Failed to fetch companies");
          const data = await res.json();
          setCompanies(Array.isArray(data) ? data : data.companies || []);
        } catch (error) {
          console.error("Failed to fetch companies:", error);
          setCompanies([]);
          toast.error(getErrorMessage(error));
        } finally {
          setLoadingCompanies(false);
        }
      };
      fetchCompanies();
    }
  }, [showForm, formData.role]);

  // Handle profile picture change
  const handleProfilePictureChange = (file: File | null) => {
    setProfilePicture(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePicturePreview(null);
    }
  };

  useEffect(() => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        searchQuery === "" ||
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === null || user.status === statusFilter;
      const matchesRole = roleFilter === null || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === "date") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else if (sortBy === "role") {
        return a.role.localeCompare(b.role);
      }
      return 0;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchQuery, statusFilter, roleFilter, sortBy]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
      console.log("Fetched users:", data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.username) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use existing profile picture or the newly selected one
      let profilePictureUrl = profilePicturePreview;

      // If editing and picture didn't change, keep the old one
      if (editingId && !profilePicture) {
        const existingUser = users.find((u) => u._id === editingId);
        profilePictureUrl = existingUser?.profilePicture || null;
      }

      if (editingId) {
        // Update existing user via API
        const response = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            ...formData,
            company: formData.assignedCompanyId || undefined,
            profilePicture: profilePictureUrl,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update user");
        }

        const responseData = await response.json();
        const updatedUser = responseData.user;

        // Update local state with response data (company is already populated)
        setUsers(
          users.map((u) =>
            (u._id as string) === editingId || u.id === editingId
              ? {
                  ...u,
                  ...updatedUser,
                }
              : u,
          ),
        );
        toast.update("User updated successfully");
      } else {
        // Create new user via API
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            company: formData.assignedCompanyId || undefined,
            profilePicture: profilePictureUrl,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create user");
        }

        const data = await response.json();
        // Add new user to local state
        const newUser: User = {
          id: data.user.id,
          name: data.user.fullName,
          fullName: data.user.fullName,
          username: data.user.username,
          email: data.user.email,
          mobile: data.user.mobile || null,
          birthDate: data.user.birthDate || null,
          nationalOrPassportNumber: null,
          idImage: null,
          licenseImage: null,
          criminalRecord: null,
          status: data.user.status,
          role: data.user.role,
          password: "",
          profilePicture: data.user.profilePicture || "",
          company: data.user.company || undefined,
          createdAt: data.user.createdAt,
          updatedAt: data.user.createdAt,
        };
        setUsers([...users, newUser]);
        toast.create("User created successfully");
      }

      resetForm();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save user";
      console.error("Failed to save user:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const response = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setUsers(users.filter((u) => (u._id as string) === id || u.id === id));
        toast.delete("User deleted successfully");
      } else {
        toast.error("Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleEdit = (user: User) => {
    console.log("Editing user:", user);
    const companyId =
      typeof user.company === "string"
        ? user.company
        : (user.company as any)?._id || "";
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      mobile: user.mobile || "",
      birthDate: user.birthDate || "",
      status: user.status,
      role: typeof user.role === "string" ? user.role : (user.role as any).name,
      assignedCompanyId: companyId,
    });
    setProfilePicturePreview(user.profilePicture || null);
    setProfilePicture(null);
    setEditingId((user._id as string) || user.id!);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      username: "",
      email: "",
      mobile: "",
      birthDate: "",
      status: "active",
      role: "client",
      assignedCompanyId: "",
    });
    setProfilePicture(null);
    setProfilePicturePreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  const statuses = Array.from(new Set(users.map((u) => u.status)));
  const roles = Array.from(new Set(users.map((u) => u.role)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-muted/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information Section */}
            <div
              className={`space-y-4 ${editingId ? "opacity-60 pointer-events-none" : ""}`}
            >
              <h3 className="text-lg font-semibold text-foreground">
                Account Information
                {editingId && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Read-only)
                  </span>
                )}
              </h3>

              {/* Row 1: Full Name & Username */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Full Name *
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="bg-background"
                    disabled={!!editingId}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Username *
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="bg-background"
                    disabled={!!editingId}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Email & Mobile Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="bg-background"
                    disabled={!!editingId}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="mobile"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Mobile Number
                  </label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+201234567890"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                    className="bg-background"
                    disabled={!!editingId}
                  />
                </div>
              </div>

              {/* Birth Date - Full Width */}
              <div>
                <label
                  htmlFor="birthDate"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Birth Date
                </label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthDate: e.target.value })
                  }
                  className="bg-background"
                  disabled={!!editingId}
                />
              </div>

              {/* Profile Picture - Full Width */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Picture
                </label>
                <ProfilePictureUpload
                  value={profilePicture}
                  onChange={editingId ? () => {} : handleProfilePictureChange}
                  preview={profilePicturePreview}
                  disabled={!!editingId}
                />
              </div>
            </div>

            {/* Role and Status Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Permissions & Status
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Role *
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="company">Company</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Status *
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Company Assignment Section - Only show for company role */}
            {formData.role === "company" && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Company Assignment
                </h3>
                {loadingCompanies ? (
                  <div className="flex items-center justify-center py-8 border border-border rounded-md bg-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-muted-foreground">
                      Loading companies...
                    </span>
                  </div>
                ) : companies.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto border border-border rounded-md p-4">
                    {companies.map((company: any) => (
                      <label
                        key={company._id || company.id}
                        className="flex items-start p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="company"
                          value={company._id || company.id}
                          checked={
                            formData.assignedCompanyId ===
                            (company._id || company.id)
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              assignedCompanyId: e.target.value,
                            })
                          }
                          className="mt-1 cursor-pointer"
                          required
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-foreground">
                            {company.name}
                          </p>
                          <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                            {company.email && <p>📧 {company.email}</p>}
                            {company.phoneNumber && (
                              <p>📱 {company.phoneNumber}</p>
                            )}
                            {company.address && <p>📍 {company.address}</p>}
                            {company.rate && <p>⭐ Rating: {company.rate}</p>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 border border-border rounded-md bg-muted text-muted-foreground text-sm">
                    No companies available
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 cursor-pointer gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {editingId ? "Updating..." : "Creating..."}
                  </>
                ) : editingId ? (
                  "Update User"
                ) : (
                  "Create User"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 bg-transparent cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Status
              </label>
              <select
                value={statusFilter || ""}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Role
              </label>
              <select
                value={roleFilter || ""}
                onChange={(e) => setRoleFilter(e.target.value || null)}
                className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="name">Name (A-Z)</option>
                <option value="role">Role</option>
                <option value="date">Date Created (Newest)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Results
              </label>
              <div className="flex items-center justify-center h-9 px-2 border border-border rounded bg-background text-sm">
                {filteredUsers.length} total
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <div className="space-y-2">
        {paginatedUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users found matching your criteria
          </div>
        ) : (
          paginatedUsers.map((user) => {
            const primaryAddress =
              user.locations && user.locations.length > 0
                ? user.locations.find((a: any) => a.primary) ||
                  user.locations[0]
                : null;
            return (
              <Card key={user.username} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {user.profilePicture ? (
                      <Image
                        src={user.profilePicture}
                        alt={user.fullName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.fullName}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {user.role}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        {user.mobile && <span>📱 {user.mobile}</span>}
                        {user.birthDate && (
                          <span>
                            🎂 {new Date(user.birthDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {primaryAddress && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {primaryAddress.city}, {primaryAddress.country}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(user)}
                      className="bg-transparent gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handleDelete((user._id as string) || user.id!)
                      }
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={pageNum > totalPages}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
