"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useTranslation } from "@/app/context/LocaleContext";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  capacity: string;
  licensePlate: string;
  location: string;
  status: string;
  createdAt: string;
}

export function AdminVehicleManagementTab() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    capacity: "",
    licensePlate: "",
    location: "",
    status: "Available",
  });

  const vehicleTypes = [
    "Box Truck",
    "Cargo Van",
    "Pickup",
    "Semi Truck",
    "Motorcycle",
  ];
  const statuses = ["Available", "In Use", "Maintenance", "Retired"];
  const countries = [
    "United States",
    "Canada",
    "United Kingdom",
    "Germany",
    "France",
    "Egypt",
  ];

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/vehicles");
      const data = await response.json();
      setVehicles(data.vehicles || []);
      setError("");
    } catch (err) {
      setError("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (
      !formData.name ||
      !formData.type ||
      !formData.capacity ||
      !formData.licensePlate ||
      !formData.location
    ) {
      setError("Please fill all fields");
      return;
    }

    try {
      const response = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles([...vehicles, data.vehicle]);
        resetForm();
        setError("");
      }
    } catch (err) {
      setError("Failed to add vehicle");
    }
  };

  const handleEditVehicle = async () => {
    if (!editingId) return;

    try {
      const response = await fetch("/api/admin/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: editingId, ...formData }),
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(
          vehicles.map((v) => (v.id === editingId ? data.vehicle : v)),
        );
        resetForm();
        setError("");
      }
    } catch (err) {
      setError("Failed to update vehicle");
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const response = await fetch(`/api/admin/vehicles?id=${vehicleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setVehicles(vehicles.filter((v) => v.id !== vehicleId));
        setError("");
      }
    } catch (err) {
      setError("Failed to delete vehicle");
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setFormData({
      name: vehicle.name,
      type: vehicle.type,
      capacity: vehicle.capacity,
      licensePlate: vehicle.licensePlate,
      location: vehicle.location,
      status: vehicle.status,
    });
    setEditingId(vehicle.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      capacity: "",
      licensePlate: "",
      location: "",
      status: "Available",
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">{t.adminVehicles.title}</h2>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t.adminVehicles.addVehicle}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold mb-4">
          {editingId ? t.adminVehicles.vehicleName : t.adminVehicles.addVehicle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t.adminVehicles.vehicleName}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder={t.adminVehicles.vehicleName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.adminVehicles.vehicleType}</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="">{t.common.selectOption}</option>
                {vehicleTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.adminVehicles.capacity}</label>
              <input
                type="text"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder={t.adminVehicles.capacityPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t.adminVehicles.licensePlate}
              </label>
              <input
                type="text"
                value={formData.licensePlate}
                onChange={(e) =>
                  setFormData({ ...formData, licensePlate: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder={t.adminVehicles.licensePlatePlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.adminVehicles.location}</label>
              <select
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="">{t.common.selectOption}</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.adminVehicles.vehicleStatus}</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={editingId ? handleEditVehicle : handleAddVehicle}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              {editingId ? t.adminVehicles.update : t.adminVehicles.create}
            </Button>
            <Button
              onClick={resetForm}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <X className="w-4 h-4" />
              {t.common.cancel}
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : vehicles.length === 0 ? (
        <p className="text-muted-foreground">{t.adminVehicles.searchPlaceholder}</p>
      ) : (
        <div className="grid gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {vehicle.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mt-2">
                    <div>
                      <span className="font-medium">{t.adminVehicles.vehicleType}:</span> {vehicle.type}
                    </div>
                    <div>
                      <span className="font-medium">{t.adminVehicles.capacity}:</span>{" "}
                      {vehicle.capacity}
                    </div>
                    <div>
                      <span className="font-medium">{t.adminVehicles.licensePlate}:</span>{" "}
                      {vehicle.licensePlate}
                    </div>
                    <div>
                      <span className="font-medium">{t.adminVehicles.location}:</span>{" "}
                      {vehicle.location}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === "Available"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                          : vehicle.status === "In Use"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(vehicle)}
                    className="gap-1 bg-transparent"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t.adminVehicles.update}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    className="gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.common.delete}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
