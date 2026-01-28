"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, MapPin, Package, Truck } from "lucide-react";

interface Shipment {
  id: string;
  orderId: string;
  driverId: string;
  vehicleId: string;
  from: string;
  to: string;
  status: string;
  progress: number;
}

const countryCoords: Record<string, [number, number]> = {
  "United States": [37.0902, -95.7129],
  Canada: [56.1304, -106.3468],
  "United Kingdom": [55.3781, -3.436],
  Germany: [51.1657, 10.4515],
  France: [46.2276, 2.2137],
  Egypt: [26.8206, 30.8025],
  Spain: [40.4637, -3.7492],
  Italy: [41.8719, 12.5674],
  Japan: [36.2048, 138.2529],
  China: [35.8617, 104.1954],
  India: [20.5937, 78.9629],
  Brazil: [-14.235, -51.9253],
  Australia: [-25.2744, 133.7751],
};

export function AdminShipmentsMapTab() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      // Simulate fetching shipments with in-transit status
      const shipmentData: Shipment[] = [
        {
          id: "ASSIGN-001",
          orderId: "REQ-001",
          driverId: "driver-001",
          vehicleId: "VEH-003",
          from: "United States",
          to: "Canada",
          status: "In Transit",
          progress: 65,
        },
        {
          id: "ASSIGN-002",
          orderId: "REQ-004",
          driverId: "driver-003",
          vehicleId: "VEH-003",
          from: "Germany",
          to: "France",
          status: "In Transit",
          progress: 45,
        },
      ];
      setShipments(shipmentData);
      setError("");
    } catch (err) {
      setError("Failed to load shipments");
    } finally {
      setLoading(false);
    }
  };

  const interpolateCoordinates = (
    from: [number, number],
    to: [number, number],
    progress: number,
  ) => {
    const t = progress / 100;
    return [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
    ] as [number, number];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Live Shipment Map
        </h2>
        <p className="text-muted-foreground mb-4">
          Real-time tracking of all active deliveries
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading shipments...</p>
      ) : shipments.length === 0 ? (
        <p className="text-muted-foreground">No active shipments</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <Card className="lg:col-span-2 p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="relative w-full h-96 md:h-full rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 border border-border">
              <svg
                className="w-full h-full"
                viewBox="0 0 1000 600"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid */}
                <defs>
                  <pattern
                    id="grid"
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      opacity="0.1"
                    />
                  </pattern>
                </defs>
                <rect
                  width="1000"
                  height="600"
                  fill="url(#grid)"
                  className="text-slate-400"
                />

                {/* Routes */}
                {shipments.map((shipment) => {
                  const fromCoord = countryCoords[shipment.from];
                  const toCoord = countryCoords[shipment.to];
                  if (!fromCoord || !toCoord) return null;

                  const fromPos = [
                    fromCoord[1] * 2 + 500,
                    fromCoord[0] * 5 + 300,
                  ] as [number, number];
                  const toPos = [
                    toCoord[1] * 2 + 500,
                    toCoord[0] * 5 + 300,
                  ] as [number, number];

                  return (
                    <g key={shipment.id}>
                      {/* Route line */}
                      <line
                        x1={fromPos[0]}
                        y1={fromPos[1]}
                        x2={toPos[0]}
                        y2={toPos[1]}
                        stroke="currentColor"
                        strokeWidth="2"
                        opacity="0.3"
                        className="text-primary"
                      />
                      {/* From marker */}
                      <circle
                        cx={fromPos[0]}
                        cy={fromPos[1]}
                        r="6"
                        fill="currentColor"
                        className="text-green-500"
                      />
                      {/* To marker */}
                      <circle
                        cx={toPos[0]}
                        cy={toPos[1]}
                        r="6"
                        fill="currentColor"
                        className="text-red-500"
                      />
                      {/* Current position */}
                      {fromPos[0] && toPos[0] && (
                        <>
                          {(() => {
                            const currentPos = interpolateCoordinates(
                              [fromPos[0], fromPos[1]],
                              [toPos[0], toPos[1]],
                              shipment.progress,
                            );
                            return (
                              <g>
                                <circle
                                  cx={currentPos[0]}
                                  cy={currentPos[1]}
                                  r="8"
                                  fill="currentColor"
                                  className="text-primary"
                                  opacity="0.8"
                                />
                                <circle
                                  cx={currentPos[0]}
                                  cy={currentPos[1]}
                                  r="8"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="text-primary"
                                  opacity="0.3"
                                >
                                  <animate
                                    attributeName="r"
                                    from="8"
                                    to="14"
                                    dur="1.5s"
                                    repeatCount="indefinite"
                                  />
                                  <animate
                                    attributeName="opacity"
                                    from="0.8"
                                    to="0"
                                    dur="1.5s"
                                    repeatCount="indefinite"
                                  />
                                </circle>
                              </g>
                            );
                          })()}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-foreground">Origin</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-foreground">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-foreground">Destination</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Shipments List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Active Shipments
            </h3>
            {shipments.map((shipment) => (
              <Card key={shipment.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">
                      {shipment.orderId}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {shipment.from} → {shipment.to}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      <span>{shipment.status}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">Progress</span>
                      <span className="text-xs text-primary font-semibold">
                        {shipment.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${shipment.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
