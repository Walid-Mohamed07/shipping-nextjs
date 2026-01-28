"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Check, X } from "lucide-react";

interface Assignment {
  id: string;
  requestId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  status: string;
  assignedAt: string;
}

interface Driver {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  name: string;
}

export function AdminOverrideAssignmentsTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overridingId, setOverridingId] = useState<string | null>(null);
  const [overrideData, setOverrideData] = useState({
    driverId: "",
    vehicleId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch resources
      const resourcesResponse = await fetch("/api/admin/resources");
      const resourcesData = await resourcesResponse.json();
      setDrivers(resourcesData.drivers || []);
      setVehicles(resourcesData.vehicles || []);

      // Simulate fetching assignments
      const assignmentData: Assignment[] = [
        {
          id: "ASSIGN-001",
          requestId: "REQ-001",
          driverId: "driver-001",
          driverName: "Mike Johnson",
          vehicleId: "VEH-003",
          vehicleName: "Cargo Van C",
          status: "Assigned",
          assignedAt: "2024-01-19T14:30:00Z",
        },
      ];
      setAssignments(assignmentData);
      setError("");
    } catch (err) {
      setError("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!overridingId || !overrideData.driverId || !overrideData.vehicleId) {
      setError("Please select driver and vehicle");
      return;
    }

    try {
      const response = await fetch("/api/admin/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: overridingId,
          driverId: overrideData.driverId,
          vehicleId: overrideData.vehicleId,
          isOverride: true,
        }),
      });

      if (response.ok) {
        setAssignments(
          assignments.map((a) =>
            a.id === overridingId
              ? {
                  ...a,
                  driverId: overrideData.driverId,
                  driverName:
                    drivers.find((d) => d.id === overrideData.driverId)?.name ||
                    "",
                  vehicleId: overrideData.vehicleId,
                  vehicleName:
                    vehicles.find((v) => v.id === overrideData.vehicleId)
                      ?.name || "",
                }
              : a,
          ),
        );
        setOverridingId(null);
        setOverrideData({ driverId: "", vehicleId: "" });
        setError("");
      }
    } catch (err) {
      setError("Failed to override assignment");
    }
  };

  const startOverride = (assignment: Assignment) => {
    setOverridingId(assignment.id);
    setOverrideData({
      driverId: assignment.driverId,
      vehicleId: assignment.vehicleId,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Override Assignments
        </h2>
        <p className="text-muted-foreground mt-1">
          Change driver and vehicle assignments for active shipments
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <p className="text-muted-foreground">No active assignments</p>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-6">
              {overridingId === assignment.id ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">
                    Override Assignment {assignment.id}
                  </h3>

                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <p className="text-sm text-orange-800 dark:text-orange-400 mb-3">
                      <strong>Order:</strong> {assignment.requestId}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Assign Driver
                        </label>
                        <select
                          value={overrideData.driverId}
                          onChange={(e) =>
                            setOverrideData({
                              ...overrideData,
                              driverId: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        >
                          <option value="">Select driver...</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}{" "}
                              {driver.id === assignment.driverId
                                ? "(current)"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Assign Vehicle
                        </label>
                        <select
                          value={overrideData.vehicleId}
                          onChange={(e) =>
                            setOverrideData({
                              ...overrideData,
                              vehicleId: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        >
                          <option value="">Select vehicle...</option>
                          {vehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.name}{" "}
                              {vehicle.id === assignment.vehicleId
                                ? "(current)"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleOverride}
                        className="gap-2 bg-orange-600 hover:bg-orange-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Confirm Override
                      </Button>
                      <Button
                        onClick={() => setOverridingId(null)}
                        variant="outline"
                        className="gap-2 bg-transparent"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-foreground">
                        {assignment.id}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded-full font-medium">
                        {assignment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Order</p>
                        <p className="font-medium text-foreground">
                          {assignment.requestId}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Driver</p>
                        <p className="font-medium text-foreground">
                          {assignment.driverName}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium text-foreground">
                          {assignment.vehicleName}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assigned At</p>
                        <p className="font-medium text-foreground">
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => startOverride(assignment)}
                    variant="outline"
                    className="gap-2 bg-transparent text-orange-600 hover:text-orange-700 border-orange-200"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Override
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
