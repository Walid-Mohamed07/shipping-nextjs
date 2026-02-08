"use client";

import React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus, User as UserIcon } from "lucide-react";
import { type User } from "@/types";

interface Address {
  id: string;
  country: string;
  countryCode: string;
  fullName: string;
  mobile: string;
  street: string;
  building: string;
  city: string;
  district: string;
  governorate: string;
  postalCode: string;
  landmark: string;
  addressType: string;
  deliveryInstructions: string;
  primary: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export function AdminUsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    birthDate: "",
    status: "active" as "active" | "inactive" | "suspended",
    role: "client" as "client" | "admin" | "driver",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
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
      alert("Please fill in all required fields");
      return;
    }

    try {
      const now = new Date().toISOString();
      const newUser: User = {
        id: Date.now().toString(),
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        birthDate: formData.birthDate || null,
        nationalOrPassportNumber: null,
        idImage: null,
        licenseImage: null,
        criminalRecord: null,
        status: formData.status,
        role: formData.role,
        password: "",
        profilePicture: formData.profilePicture,
        locations: [],
        createdAt: now,
        updatedAt: now,
      };

      const updatedUsers = editingId
        ? users.map((u) =>
            u.id === editingId ? { ...u, ...formData, updatedAt: now } : u,
          )
        : [...users, newUser];

      setUsers(updatedUsers);
      resetForm();
      alert(editingId ? "User updated" : "User created");
    } catch (error) {
      console.error("Failed to save user:", error);
      alert("Failed to save user");
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure?")) return;
    setUsers(users.filter((u) => u.id !== id));
    alert("User deleted");
  };

  const handleEdit = (user: User) => {
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      birthDate: user.birthDate || "",
      status: user.status,
      role: typeof user.role === "string" ? user.role : (user.role as any).name,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      username: "",
      email: "",
      birthDate: "",
      status: "active",
      role: "client",
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="px-3 py-2 border border-border rounded-md bg-background"
                required
              />
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="px-3 py-2 border border-border rounded-md bg-background"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="px-3 py-2 border border-border rounded-md bg-background"
                required
              />
              <input
                type="date"
                placeholder="Birth Date"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
                className="px-3 py-2 border border-border rounded-md bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as any })
                }
                className="px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
                <option value="driver">Driver</option>
              </select>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
                className="px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? "Update" : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1 bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {users.map((user) => {
          const primaryAddress =
            user.locations.find((a) => a.primary) || user.locations[0];
          return (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
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
                    {primaryAddress && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {primaryAddress.city}, {primaryAddress.country} ·{" "}
                        {primaryAddress.mobile}
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
                    onClick={() => handleDelete(user.id)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
