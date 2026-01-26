"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Truck, User } from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
  country: string;
  state?: string;
  location?: string;
}

interface Location {
  country?: string;
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
  label?: string;
  address?: string;
  [key: string]: any;
}

interface Order {
  id: string;
  from: Location;
  to: Location;
  item: string;
  category: string;
  warehouseId?: string;
  orderStatus: string;
  pickupMode: string;
  estimatedCost?: string;
  estimatedTime?: string;
}
// Helper to format a location object for display
const formatLocation = (loc: Location) => {
  if (!loc) return "-";
  if (loc.label) return loc.label;
  if (loc.address && loc.city && loc.country) {
    return `${loc.address}, ${loc.city}, ${loc.country}`;
  }
  if (loc.address) return loc.address;
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  if (loc.city) return loc.city;
  if (loc.country) return loc.country;
  return "-";
};

interface Address {
  country: string;
  countryCode?: string;
  fullName: string;
  mobile: string;
  street: string;
  building?: string;
  city: string;
  district?: string;
  governorate?: string;
  postalCode: string;
  landmark?: string;
  addressType: string;
  deliveryInstructions?: string;
  primary?: boolean;
}

interface Vehicle {
  id: string;
  name: string;
  type: string;
  capacity: string;
  plateNumber: string;
  status: string;
  country: string;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  locations: Address[];
}

interface AdminAssignmentTabProps {
  acceptedOrderIds: string[];
}

export function AdminAssignmentTab({
  acceptedOrderIds,
}: AdminAssignmentTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [selectedFromCountry, setSelectedFromCountry] = useState<string>("");
  const [selectedToCountry, setSelectedToCountry] = useState<string>("");
  const [selectedFrom, setSelectedFrom] = useState<string>("");
  const [selectedTo, setSelectedTo] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  // const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, resourcesRes, assignmentsRes] = await Promise.all([
          fetch("/api/admin/orders"),
          fetch("/api/admin/resources"),
          fetch("/api/admin/assign"),
          fetch("/api/admin/warehouse"),
        ]);

        const ordersData = await ordersRes.json();
        const resourcesData = await resourcesRes.json();
        const assignmentsData = await assignmentsRes.json();
        const warehousesData = await (
          await fetch("/api/admin/warehouse")
        ).json();

        setOrders(
          ordersData.requests.filter(
            (o: Order) => o.orderStatus === "Accepted",
          ),
        );
        setVehicles(
          resourcesData.vehicles.filter(
            (v: Vehicle) => v.status === "available",
          ),
        );
        setDrivers(resourcesData.drivers);
        setAssignments(assignmentsData.assignments);
        setWarehouses(warehousesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // When order changes, set warehouse selection
  useEffect(() => {
    if (!selectedOrder) {
      setSelectedWarehouse("");
      setSelectedFromCountry("");
      setSelectedToCountry("");
      setSelectedFrom("");
      setSelectedTo("");
      setSelectedDriver("");
      return;
    }
    const order = orders.find((o) => o.id === selectedOrder);
    if (order && order.from && order.from.country) {
      setSelectedFromCountry(order.from.country);
      setSelectedToCountry(order.to?.country || "");
      setSelectedTo(
        `${order.to.building}, ${order.to.street}, ${order.to.city} - ${order.from.country}`,
      );
      setSelectedFrom(
        `${order.from.building}, ${order.from.street}, ${order.from.city} - ${order.from.country}`,
      );
      // Filter warehouses by country
      const filtered = warehouses.filter(
        (w) => w.country === order.from.country,
      );
      // Set initial value from order.warehouseId if present
      // @ts-ignore
      if (
        order.warehouseId &&
        filtered.some((w) => w.id === order.warehouseId)
      ) {
        // @ts-ignore
        setSelectedWarehouse(order.warehouseId);
      } else if (filtered.length > 0) {
        setSelectedWarehouse(filtered[0].id);
      } else {
        setSelectedWarehouse("");
      }
      setSelectedDriver(""); // reset driver when order changes
    } else {
      setSelectedWarehouse("");
      setSelectedFromCountry("");
      setSelectedToCountry("");
      setSelectedFrom("");
      setSelectedTo("");
      setSelectedDriver("");
    }
  }, [selectedOrder, orders, warehouses]);

  const handleAssign = async () => {
    if (
      !selectedOrder ||
      !selectedFromCountry ||
      !selectedToCountry ||
      !selectedFrom ||
      !selectedTo ||
      !selectedDriver ||
      !selectedVehicle
    ) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch("/api/admin/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedOrder,
          driverId: selectedDriver,
          vehicleId: selectedVehicle,
          // estimatedDelivery,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments([...assignments, data.assignment]);
        // Remove the assigned order from the list
        setOrders(orders.filter((o) => o.id !== selectedOrder));
        setSelectedOrder("");
        setSelectedFromCountry("");
        setSelectedToCountry("");
        setSelectedDriver("");
        setSelectedVehicle("");
      }
    } catch (error) {
      console.error("Failed to create assignment:", error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const unassignedOrders = orders.filter(
    (o) => !assignments.some((a) => a.requestId === o.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Assign Orders</h3>
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Order
              </label>
              <select
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Choose an order...</option>
                {unassignedOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id} - {formatLocation(order.from)} →{" "}
                    {formatLocation(order.to)} - {order.item} - {order.category}{" "}
                    - {order.from.fullName} → {order.to.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Route From and Route To are now readonly input fields set from order */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Route From
                </label>
                <input
                  type="text"
                  value={selectedOrder ? selectedFrom : ""}
                  placeholder={selectedOrder ? undefined : "Choose order first"}
                  readOnly
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Route To
                </label>
                <input
                  type="text"
                  value={selectedOrder ? selectedTo : ""}
                  placeholder={selectedOrder ? undefined : "Choose order first"}
                  readOnly
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selected Warehouse Field */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Selected Warehouse
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  disabled={!selectedOrder}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                >
                  <option value="">
                    {selectedOrder
                      ? "Choose a warehouse..."
                      : "Select order first..."}
                  </option>
                  {(() => {
                    const order = orders.find((o) => o.id === selectedOrder);
                    if (!order || !order.from || !order.from.country)
                      return null;
                    return warehouses
                      .filter((w) => w.country === order.from.country)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.state || w.country})
                        </option>
                      ));
                  })()}
                </select>
              </div>

              {/* Pickup Mode Field */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pickup Mode
                </label>
                <input
                  type="text"
                  value={(() => {
                    const order = orders.find((o) => o.id === selectedOrder);
                    return order?.pickupMode || "";
                  })()}
                  readOnly
                  placeholder={selectedOrder ? undefined : "Select order first"}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Driver
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  disabled={!selectedOrder || !selectedFromCountry}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                >
                  <option value="">
                    {selectedOrder && selectedFromCountry
                      ? "Choose a driver..."
                      : "Select order first..."}
                  </option>
                  {drivers
                    .filter((driver) =>
                      driver.locations.some(
                        (location) => location.country === selectedFromCountry,
                      ),
                    )
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} (
                        {
                          driver.locations.find(
                            (location) =>
                              location.country === selectedFromCountry,
                          )?.country
                        }
                        )
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Vehicle
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  disabled={!selectedFromCountry}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                >
                  <option value="">
                    {selectedFromCountry
                      ? "Choose a vehicle..."
                      : "Select origin country first..."}
                  </option>
                  {vehicles
                    .filter(
                      (vehicle) =>
                        vehicle.country === selectedFromCountry &&
                        vehicle.status === "available",
                    )
                    .map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.type} ({vehicle.country})
                      </option>
                    ))}
                </select>
              </div>

              {/* Estimated Cost Field */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Estimated Cost
                </label>
                <input
                  type="text"
                  value={(() => {
                    const order = orders.find((o) => o.id === selectedOrder);
                    return order?.estimatedCost || "";
                  })()}
                  readOnly
                  placeholder={selectedOrder ? undefined : "Select order first"}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                />
              </div>

              {/* Estimated Time Field */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Estimated Delivery Time
                </label>
                <input
                  type="text"
                  value={(() => {
                    const order = orders.find((o) => o.id === selectedOrder);
                    return order?.estimatedTime || "";
                  })()}
                  readOnly
                  placeholder={selectedOrder ? undefined : "Select order first"}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                />
              </div>
            </div>

            {/* <div>
              <label className="block text-sm font-medium mb-2">
                Estimated Delivery
              </label>
              <input
                type="datetime-local"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div> */}

            <Button
              onClick={handleAssign}
              className="w-full cursor-pointer"
              disabled={
                !selectedOrder ||
                !selectedFromCountry ||
                !selectedToCountry ||
                !selectedDriver ||
                !selectedVehicle
              }
            >
              Assign Order
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Active Assignments ({assignments.length})
        </h3>
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No active assignments</p>
            </Card>
          ) : (
            assignments.map((assignment) => (
              <Card key={assignment.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-foreground mb-2">
                      {assignment.requestId}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Route:</span>
                        <span>
                          {formatLocation(assignment.from)} →{" "}
                          {formatLocation(assignment.to)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span>{assignment.driverName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <span>{assignment.vehicleName}</span>
                      </div>
                    </div>
                  </div>
                  {/* <div className="text-sm">
                    <p className="text-muted-foreground mb-2">
                      Estimated Delivery
                    </p>
                    <p className="font-medium">
                      {new Date(
                        assignment.estimatedDelivery,
                      ).toLocaleDateString()}
                    </p>
                    <span className="inline-block mt-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {assignment.status}
                    </span>
                  </div> */}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
