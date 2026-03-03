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
  Eye,
  EyeOff,
} from "lucide-react";
import { type User } from "@/types";
import ProfilePictureUpload from "@/app/components/ProfilePictureUpload";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { useTranslation } from "@/app/context/LocaleContext";

export function AdminUsersTab() {
  const toast = useToast();
  const { t } = useTranslation();

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      client: t.adminUsers.clientRole,
      admin: t.adminUsers.adminRole,
      operator: t.adminUsers.operatorRole,
      company: t.adminUsers.companyRole,
      driver: t.adminUsers.driverRole,
    };
    return labels[role] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      active: t.common.active,
      inactive: t.common.inactive,
      suspended: t.common.suspended,
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };
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
    password: "",
    confirmPassword: "",
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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

  // Password validation function
  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return { valid: false, message: "Password must contain at least one special character (!@#$%^&*)" };
    }
    return { valid: true, message: "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.username) {
      toast.error(t.adminUsers.fillRequired);
      return;
    }

    // For create mode, validate password
    if (!editingId) {
      if (!formData.password) {
        toast.error(t.adminUsers.passwordRequired);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error(t.adminUsers.passwordsNoMatch);
        return;
      }
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        toast.error(passwordValidation.message);
        return;
      }
    }

    // For update mode with change password
    if (editingId && changePasswordMode) {
      if (!newPassword) {
        toast.error(t.adminUsers.enterNewPasswordError);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error(t.adminUsers.newPasswordsNoMatch);
        return;
      }
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        toast.error(passwordValidation.message);
        return;
      }
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
        const updatePayload: any = {
          id: editingId,
          ...formData,
          company: formData.assignedCompanyId || undefined,
          profilePicture: profilePictureUrl,
        };

        // Remove password fields from base formData for update (unless changing password)
        if (changePasswordMode) {
          updatePayload.newPassword = newPassword;
        }
        delete updatePayload.password;
        delete updatePayload.confirmPassword;

        const response = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
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
        toast.update(t.adminUsers.userUpdated);
      } else {
        // Create new user via API
        const createPayload: any = {
          ...formData,
          company: formData.assignedCompanyId || undefined,
          profilePicture: profilePictureUrl,
        };
        delete createPayload.confirmPassword; // Don't send confirm password to API

        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
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
        toast.create(t.adminUsers.userCreated);
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
        toast.delete(t.adminUsers.userDeleted);
      } else {
        toast.error(t.adminUsers.failedDelete);
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
      password: "",
      confirmPassword: "",
    });
    setProfilePicturePreview(user.profilePicture || null);
    setProfilePicture(null);
    setEditingId((user._id as string) || user.id!);
    setShowForm(true);
    setChangePasswordMode(false);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
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
      password: "",
      confirmPassword: "",
    });
    setProfilePicture(null);
    setProfilePicturePreview(null);
    setEditingId(null);
    setShowForm(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setChangePasswordMode(false);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  if (loading) return <div className="text-center py-8">{t.common.loading}</div>;

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
        <h2 className="text-2xl font-bold">{t.adminUsers.title}</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t.adminUsers.addUser}
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
                {t.adminUsers.accountInfo}
                {editingId && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {t.adminUsers.readOnly}
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
                    {t.adminUsers.fullName}
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
                    {t.adminUsers.username}
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
                    {t.adminUsers.emailAddress}
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
                    {t.adminUsers.mobileNumber}
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
                  {t.adminUsers.birthDate}
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
                  {t.adminUsers.profilePicture}
                </label>
                <ProfilePictureUpload
                  value={profilePicture}
                  onChange={editingId ? () => {} : handleProfilePictureChange}
                  preview={profilePicturePreview}
                  disabled={!!editingId}
                />
              </div>
            </div>

            {/* Password Section */}
            {!editingId && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.adminUsers.passwordSection}
                </h3>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      {t.adminUsers.passwordLabel}
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t.adminUsers.enterPassword}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        className="bg-background pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t.adminUsers.passwordHint}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      {t.adminUsers.confirmPasswordLabel}
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t.adminUsers.confirmPasswordPlaceholder}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="bg-background pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role and Status Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {t.adminUsers.permissionsStatus}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {t.adminUsers.roleLabel}
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="client">{t.adminUsers.clientRole}</option>
                    <option value="admin">{t.adminUsers.adminRole}</option>
                    <option value="operator">{t.adminUsers.operatorRole}</option>
                    <option value="company">{t.adminUsers.companyRole}</option>
                    <option value="driver">{t.adminUsers.driverRole}</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {t.adminUsers.statusLabel}
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
                    <option value="active">{t.common.active}</option>
                    <option value="inactive">{t.common.inactive}</option>
                    <option value="suspended">{t.common.suspended}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Company Assignment Section - Only show for company role */}
            {formData.role === "company" && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.adminUsers.companyAssignment}
                </h3>
                {loadingCompanies ? (
                  <div className="flex items-center justify-center py-8 border border-border rounded-md bg-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-muted-foreground">
                      {t.adminUsers.loadingCompanies}
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
                    {t.adminUsers.noCompanies}
                  </div>
                )}
              </div>
            )}

            {/* Change Password Section - Only show when editing */}
            {editingId && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t.adminUsers.passwordManagement}
                  </h3>
                  {!changePasswordMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setChangePasswordMode(true)}
                      className="cursor-pointer"
                    >
                      {t.adminUsers.changePassword}
                    </Button>
                  )}
                </div>

                {changePasswordMode && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {t.adminUsers.newPasswordHint}
                    </p>

                    {/* New Password & Confirm New Password */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="newPassword"
                          className="block text-sm font-medium text-foreground mb-2"
                        >
                          {t.adminUsers.newPasswordLabel}
                        </label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            placeholder={t.adminUsers.enterNewPassword}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-background pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t.adminUsers.passwordHint}
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="confirmNewPassword"
                          className="block text-sm font-medium text-foreground mb-2"
                        >
                          {t.adminUsers.confirmNewPasswordLabel}
                        </label>
                        <div className="relative">
                          <Input
                            id="confirmNewPassword"
                            type={showConfirmNewPassword ? "text" : "password"}
                            placeholder={t.adminUsers.confirmNewPasswordPlaceholder}
                            value={confirmNewPassword}
                            onChange={(e) =>
                              setConfirmNewPassword(e.target.value)
                            }
                            className="bg-background pr-10"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmNewPassword(!showConfirmNewPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setChangePasswordMode(false);
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setShowNewPassword(false);
                        setShowConfirmNewPassword(false);
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {t.adminUsers.cancelPasswordChange}
                    </button>
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
                    {editingId ? t.adminUsers.updating : t.adminUsers.creating}
                  </>
                ) : editingId ? (
                  t.adminUsers.updateUser
                ) : (
                  t.adminUsers.createUser
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 bg-transparent cursor-pointer"
              >
                {t.common.cancel}
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
              placeholder={t.adminUsers.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t.adminUsers.filterStatus}
              </label>
              <select
                value={statusFilter || ""}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="">{t.adminUsers.allStatuses}</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {getStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t.adminUsers.filterRole}
              </label>
              <select
                value={roleFilter || ""}
                onChange={(e) => setRoleFilter(e.target.value || null)}
                className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="">{t.adminUsers.allRoles}</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t.adminUsers.sortBy}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="name">{t.adminUsers.nameAZ}</option>
                <option value="role">{t.adminUsers.sortByRole}</option>
                <option value="date">{t.adminUsers.dateCreated}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t.adminUsers.results}
              </label>
              <div className="flex items-center justify-center h-9 px-2 border border-border rounded bg-background text-sm">
                {filteredUsers.length} {t.adminUsers.total}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <div className="space-y-2">
        {paginatedUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t.adminUsers.noUsersFound}
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
                          {getRoleLabel(user.role)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {getStatusLabel(user.status)}
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
