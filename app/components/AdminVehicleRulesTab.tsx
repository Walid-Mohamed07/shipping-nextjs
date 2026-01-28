"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Vehicle } from "@/types";

interface CapacityRule {
  id: string;
  vehicleId: string;
  vehicleName: string;
  maxWeight: number;
  maxDimensions: string;
  allowedCategories: string[];
  minDeliveryDays: number;
  maxDeliveryDays: number;
  createdAt: string;
}

export function AdminVehicleRulesTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rules, setRules] = useState<CapacityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<CapacityRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: "",
    maxWeight: "",
    maxDimensions: "",
    allowedCategories: [] as string[],
    minDeliveryDays: "",
    maxDeliveryDays: "",
  });

  const categories = [
    "Electronics",
    "Books",
    "Clothing",
    "Office",
    "Fragile",
    "Food",
    "Furniture",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const vehiclesResponse = await fetch("/api/admin/resources");
      const vehiclesData = await vehiclesResponse.json();
      setVehicles(vehiclesData.vehicles || []);

      const rulesResponse = await fetch("/api/admin/vehicle-rules");
      const rulesData = await rulesResponse.json();
      setRules(rulesData.rules || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!formData.vehicleId || !formData.maxWeight || !formData.maxDimensions) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const method = editingRule ? "PUT" : "POST";
      const body = editingRule
        ? {
            ...editingRule,
            ...formData,
            maxWeight: parseInt(formData.maxWeight),
            minDeliveryDays: parseInt(formData.minDeliveryDays),
            maxDeliveryDays: parseInt(formData.maxDeliveryDays),
          }
        : {
            ...formData,
            maxWeight: parseInt(formData.maxWeight),
            minDeliveryDays: parseInt(formData.minDeliveryDays),
            maxDeliveryDays: parseInt(formData.maxDeliveryDays),
          };

      const response = await fetch("/api/admin/vehicle-rules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchData();
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save rule:", error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      try {
        const response = await fetch("/api/admin/vehicle-rules", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId }),
        });

        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error("Failed to delete rule:", error);
      }
    }
  };

  const handleEditRule = (rule: CapacityRule) => {
    setEditingRule(rule);
    setFormData({
      vehicleId: rule.vehicleId,
      maxWeight: rule.maxWeight.toString(),
      maxDimensions: rule.maxDimensions,
      allowedCategories: rule.allowedCategories,
      minDeliveryDays: rule.minDeliveryDays.toString(),
      maxDeliveryDays: rule.maxDeliveryDays.toString(),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      vehicleId: "",
      maxWeight: "",
      maxDimensions: "",
      allowedCategories: [],
      minDeliveryDays: "",
      maxDeliveryDays: "",
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedCategories: prev.allowedCategories.includes(category)
        ? prev.allowedCategories.filter((c) => c !== category)
        : [...prev.allowedCategories, category],
    }));
  };

  if (loading) {
    return <div className="text-center py-8">Loading vehicle rules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Vehicle & Capacity Rules
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Define capacity and delivery constraints for each vehicle
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Rule"}
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6 bg-card border-primary/30">
          <h3 className="font-semibold text-foreground mb-4">
            {editingRule ? "Edit Rule" : "Create New Rule"}
          </h3>

          <div className="space-y-4">
            {/* Vehicle Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Vehicle
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) =>
                  setFormData({ ...formData, vehicleId: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.type} ({vehicle.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Max Weight */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Weight (kg)
              </label>
              <input
                type="number"
                value={formData.maxWeight}
                onChange={(e) =>
                  setFormData({ ...formData, maxWeight: e.target.value })
                }
                placeholder="e.g., 5000"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            {/* Max Dimensions */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Dimensions (L×W×H cm)
              </label>
              <input
                type="text"
                value={formData.maxDimensions}
                onChange={(e) =>
                  setFormData({ ...formData, maxDimensions: e.target.value })
                }
                placeholder="e.g., 300x200x150"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            {/* Delivery Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Min Delivery Days
                </label>
                <input
                  type="number"
                  value={formData.minDeliveryDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minDeliveryDays: e.target.value,
                    })
                  }
                  placeholder="e.g., 1"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Max Delivery Days
                </label>
                <input
                  type="number"
                  value={formData.maxDeliveryDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDeliveryDays: e.target.value,
                    })
                  }
                  placeholder="e.g., 7"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>

            {/* Allowed Categories */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Allowed Item Categories
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button onClick={handleAddRule} className="flex-1 gap-2">
                <Check className="w-4 h-4" />
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
              <Button
                onClick={resetForm}
                variant="outline"
                className="flex-1 gap-2 bg-transparent"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              No vehicle rules defined yet. Create one to get started.
            </p>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-6 border-l-4 border-l-primary">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {rule.vehicleName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Rule ID: {rule.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEditRule(rule)}
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteRule(rule.id)}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-primary/5 p-4 rounded border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">
                    Max Weight
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {rule.maxWeight} kg
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">
                    Max Dimensions
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {rule.maxDimensions} cm
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">
                    Delivery Range
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {rule.minDeliveryDays}-{rule.maxDeliveryDays} days
                  </p>
                </div>
                <div className="bg-primary/5 p-4 rounded border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">
                    Allowed Categories
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {rule.allowedCategories.length} selected
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Allowed Item Categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {rule.allowedCategories.map((category) => (
                    <span
                      key={category}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
