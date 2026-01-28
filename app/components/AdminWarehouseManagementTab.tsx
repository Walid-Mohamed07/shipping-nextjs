"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Edit2,
  Trash2,
  Plus,
  Package,
  MapPin,
  User,
  Phone,
  Warehouse,
} from "lucide-react";
import { Warehouse as WarehouseType } from "@/types";

export function WarehouseManagementTab() {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WarehouseType>>({});
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/warehouse");
      const data = await response.json();
      setWarehouses(data.warehouses);
      setError("");
    } catch (err) {
      setError("Failed to load warehouses");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (warehouse: WarehouseType) => {
    setFormData(warehouse);
    setEditingId(warehouse.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const response = await fetch("/api/admin/warehouse", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ warehouseId: editingId, ...formData }),
        });

        if (response.ok) {
          await fetchWarehouses();
          setEditingId(null);
          setFormData({});
          setShowForm(false);
        }
      } else {
        const response = await fetch("/api/admin/warehouse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await fetchWarehouses();
          setFormData({});
          setShowForm(false);
        }
      }
    } catch (err) {
      setError("Failed to save warehouse");
      console.error(err);
    }
  };

  const handleDelete = async (warehouseId: string) => {
    if (confirm("Are you sure you want to delete this warehouse?")) {
      try {
        const response = await fetch("/api/admin/warehouse", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ warehouseId }),
        });

        if (response.ok) {
          await fetchWarehouses();
        }
      } catch (err) {
        setError("Failed to delete warehouse");
        console.error(err);
      }
    }
  };

  const getStockPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getStockColor = (percentage: number) => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return <div className="text-center py-8">Loading warehouses...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          Warehouse Management
        </h2>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({});
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingId ? "Edit Warehouse" : "New Warehouse"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Warehouse Name"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="text"
              placeholder="Code"
              value={formData.code || ""}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="text"
              placeholder="Country"
              value={formData.country || ""}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="text"
              placeholder="State"
              value={formData.state || ""}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="text"
              placeholder="Location"
              value={formData.location || ""}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="number"
              placeholder="Capacity"
              value={formData.capacity || ""}
              onChange={(e) =>
                setFormData({ ...formData, capacity: Number(e.target.value) })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="number"
              placeholder="Current Stock"
              value={formData.currentStock || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentStock: Number(e.target.value),
                })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="text"
              placeholder="Manager Name"
              value={formData.manager || ""}
              onChange={(e) =>
                setFormData({ ...formData, manager: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <input
              type="tel"
              placeholder="Contact"
              value={formData.contact || ""}
              onChange={(e) =>
                setFormData({ ...formData, contact: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <select
              value={formData.status || "active"}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as any })
              }
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              {editingId ? "Update" : "Create"}
            </Button>
            <Button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({});
              }}
              variant="outline"
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => {
          const stockPercentage = getStockPercentage(
            warehouse.currentStock,
            warehouse.capacity,
          );
          return (
            <Card
              key={warehouse.id}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <Warehouse className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg">
                      {warehouse.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {warehouse.code}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    warehouse.status === "active"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                      : warehouse.status === "maintenance"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                        : "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400"
                  }`}
                >
                  {warehouse.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{warehouse.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span>{warehouse.manager}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{warehouse.contact}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Stock Level
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {warehouse.currentStock}/{warehouse.capacity} (
                    {stockPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getStockColor(stockPercentage)}`}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(warehouse)}
                  className="flex-1 gap-2 bg-transparent"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(warehouse.id)}
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {warehouses.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            No warehouses found. Create one to get started.
          </p>
        </Card>
      )}
    </div>
  );
}
