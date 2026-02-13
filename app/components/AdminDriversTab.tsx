"use client";

import React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus, MapPin, Search } from "lucide-react";

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

interface Role {
  id: string;
  name: "driver";
  createdAt: string;
  updatedAt: string;
}

interface Driver {
  id: string;
  fullName: string;
  username: string;
  email: string;
  nationalOrPassportNumber: string | null;
  birthDate: string | null;
  idImage: string | null;
  licenseImage: string | null;
  criminalRecord: string | null;
  status: "active" | "inactive" | "suspended";
  role: Role;
  password: string;
  profilePicture: string | null;
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export function AdminDriversTab() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "date">("name");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    birthDate: "",
    nationalOrPassportNumber: "",
    status: "active" as "active" | "inactive" | "suspended",
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    let filtered = drivers.filter((driver) => {
      const matchesSearch =
        searchQuery === "" ||
        driver.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === null || driver.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === "date") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return 0;
    });

    setFilteredDrivers(filtered);
    setCurrentPage(1);
  }, [drivers, searchQuery, statusFilter, sortBy]);

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      const driversList = data
        .filter((u: any) => u.role === "driver")
        .map((u: any) => ({
          // keep original fields but ensure `addresses` exists for UI
          ...u,
          addresses: u.addresses ?? u.locations ?? [],
        }));
      setDrivers(driversList);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
      setDrivers([]);
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
      const newDriver: Driver = {
        id: Date.now().toString(),
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        birthDate: formData.birthDate || null,
        nationalOrPassportNumber: formData.nationalOrPassportNumber || null,
        idImage: null,
        licenseImage: null,
        criminalRecord: null,
        status: formData.status,
        role: {
          id: "driver-role",
          name: "driver",
          createdAt: now,
          updatedAt: now,
        },
        password: "",
        profilePicture: null,
        addresses: [],
        createdAt: now,
        updatedAt: now,
      };

      const updatedDrivers = editingId
        ? drivers.map((d) =>
            d.id === editingId ? { ...d, ...formData, updatedAt: now } : d,
          )
        : [...drivers, newDriver];

      setDrivers(updatedDrivers);
      resetForm();
      alert(editingId ? "Driver updated" : "Driver created");
    } catch (error) {
      console.error("Failed to save driver:", error);
      alert("Failed to save driver");
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure?")) return;
    setDrivers(drivers.filter((d) => d.id !== id));
    alert("Driver deleted");
  };

  const handleEdit = (driver: Driver) => {
    setFormData({
      fullName: driver.fullName,
      username: driver.username,
      email: driver.email,
      birthDate: driver.birthDate || "",
      nationalOrPassportNumber: driver.nationalOrPassportNumber || "",
      status: driver.status,
    });
    setEditingId(driver.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      username: "",
      email: "",
      birthDate: "",
      nationalOrPassportNumber: "",
      status: "active" as "active" | "inactive" | "suspended",
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDrivers = filteredDrivers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  const statuses = Array.from(new Set(drivers.map((d) => d.status)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Driver Management</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Driver
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
                type="text"
                placeholder="License/Passport Number"
                value={formData.nationalOrPassportNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nationalOrPassportNumber: e.target.value,
                  })
                }
                className="px-3 py-2 border border-border rounded-md bg-background"
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

      {/* Search and Filters */}
      <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 md:col-span-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Status
            </label>
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
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
              <option value="date">Date Joined (Newest)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Drivers List */}
      <div className="space-y-2">
        {paginatedDrivers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No drivers found matching your criteria
          </div>
        ) : (
          paginatedDrivers.map((driver) => {
            const primaryAddress =
              driver.addresses.find((a) => a.primary) || driver.addresses[0];
            return (
              <Card key={driver.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{driver.fullName}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {driver.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{driver.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {driver.email}
                      </p>
                      {driver.nationalOrPassportNumber && (
                        <p className="text-xs text-muted-foreground">
                          License: {driver.nationalOrPassportNumber}
                        </p>
                      )}
                      {primaryAddress && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {primaryAddress.city},{" "}
                          {primaryAddress.country} · {primaryAddress.mobile}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(driver)}
                      className="bg-transparent gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(driver.id)}
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
        {paginatedDrivers.length === 0 && drivers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No drivers found. Create your first driver to get started.
          </div>
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
