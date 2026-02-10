"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/app/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Warehouse,
  Plus,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  Save,
  X,
} from "lucide-react";

interface CompanyWarehouse {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export default function CompanyWarehousesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<CompanyWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<CompanyWarehouse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/company/warehouses?companyId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }

    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      country: "",
      latitude: "",
      longitude: "",
    });
    setEditingWarehouse(null);
    setIsFormOpen(false);
  };

  const openEditForm = (warehouse: CompanyWarehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city || "",
      country: warehouse.country || "",
      latitude: warehouse.coordinates?.latitude?.toString() || "",
      longitude: warehouse.coordinates?.longitude?.toString() || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address) {
      alert("Name and address are required");
      return;
    }

    try {
      setSaving(true);
      
      const coordinates = formData.latitude && formData.longitude
        ? {
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
          }
        : null;

      const payload = {
        companyId: user?.id,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        coordinates,
        ...(editingWarehouse && { warehouseId: editingWarehouse.id }),
      };

      const response = await fetch("/api/company/warehouses", {
        method: editingWarehouse ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(editingWarehouse ? "Warehouse updated successfully!" : "Warehouse created successfully!");
        resetForm();
        await fetchWarehouses();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to save warehouse");
      }
    } catch (error) {
      console.error("Failed to save warehouse:", error);
      alert("Failed to save warehouse");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warehouseId: string) => {
    if (!confirm("Are you sure you want to delete this warehouse? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(warehouseId);
      const response = await fetch(
        `/api/company/warehouses?companyId=${user?.id}&warehouseId=${warehouseId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        alert("Warehouse deleted successfully!");
        await fetchWarehouses();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete warehouse");
      }
    } catch (error) {
      console.error("Failed to delete warehouse:", error);
      alert("Failed to delete warehouse");
    } finally {
      setDeleting(null);
    }
  };

  if (!user || user.role !== "company") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">
            Access denied. This page is for companies only.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              My Warehouses
            </h1>
            <p className="text-muted-foreground">
              Manage your warehouse locations for self-pickup orders
            </p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Warehouse
          </Button>
        </div>

        {/* Add/Edit Form */}
        {isFormOpen && (
          <Card className="p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Warehouse Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Warehouse"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., 123 Industrial Zone"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Cairo"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., Egypt"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., 30.0444"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g., 31.2357"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : (editingWarehouse ? "Update" : "Create")}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Warehouses List */}
        {warehouses.length === 0 ? (
          <Card className="p-12 text-center">
            <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              You don't have any warehouses yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Add a warehouse to enable self-pickup options for your shipping orders
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="mt-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Your First Warehouse
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((warehouse) => (
              <Card key={warehouse.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{warehouse.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(warehouse)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(warehouse.id)}
                      disabled={deleting === warehouse.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deleting === warehouse.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{warehouse.address}</p>
                      {(warehouse.city || warehouse.country) && (
                        <p className="text-muted-foreground">
                          {[warehouse.city, warehouse.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {warehouse.coordinates && (
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {warehouse.coordinates.latitude.toFixed(4)}, {warehouse.coordinates.longitude.toFixed(4)}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(warehouse.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
