"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronDown, Filter } from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  resourceId: string;
  resourceType: string;
  changes: Record<string, any>;
}

const actionColors: Record<string, string> = {
  ORDER_ACCEPTED:
    "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  ORDER_REJECTED:
    "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
  ASSIGNMENT_CREATED:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  ASSIGNMENT_UPDATED:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
  VEHICLE_CREATED:
    "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400",
  VEHICLE_UPDATED:
    "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400",
  VEHICLE_DELETED:
    "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
  COST_SET:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400",
};

const actionIcons: Record<string, string> = {
  ORDER_ACCEPTED: "✓",
  ORDER_REJECTED: "✗",
  ASSIGNMENT_CREATED: "→",
  ASSIGNMENT_UPDATED: "⟳",
  VEHICLE_CREATED: "+",
  VEHICLE_UPDATED: "⟳",
  VEHICLE_DELETED: "✗",
  COST_SET: "$",
};

export function AdminAuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "action" | "user">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (filterAction) {
      setFilteredLogs(logs.filter((log) => log.action === filterAction));
    } else {
      setFilteredLogs(logs);
    }
    setCurrentPage(1);
  }, [logs, filterAction]);

  useEffect(() => {
    let sorted = [...filteredLogs];

    if (sortBy === "date") {
      sorted.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } else if (sortBy === "action") {
      sorted.sort((a, b) => a.action.localeCompare(b.action));
    } else if (sortBy === "user") {
      sorted.sort((a, b) => a.userName.localeCompare(b.userName));
    }

    setFilteredLogs(sorted);
  }, [sortBy]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/audit-logs?limit=100");
      const data = await response.json();
      setLogs(data.logs || []);
      setFilteredLogs(data.logs || []);
      setError("");
    } catch (err) {
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
        <p className="text-muted-foreground mt-1">
          Track all system actions and changes
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filter and Sort Section */}
      <Card className="p-4 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setFilterAction("")}
                variant={filterAction === "" ? "default" : "outline"}
                size="sm"
                className={filterAction === "" ? "" : "bg-transparent"}
              >
                All Actions
              </Button>
              {uniqueActions.map((action) => (
                <Button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  variant={filterAction === action ? "default" : "outline"}
                  size="sm"
                  className={filterAction === action ? "" : "bg-transparent"}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground min-w-max">
              Sort By:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-2 border border-border rounded text-sm bg-background"
            >
              <option value="date">Date (Newest)</option>
              <option value="action">Action (A-Z)</option>
              <option value="user">User (A-Z)</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredLogs.length} entries
            </span>
          </div>
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading audit logs...</p>
      ) : paginatedLogs.length === 0 ? (
        <p className="text-muted-foreground">No audit logs found</p>
      ) : (
        <div className="space-y-2">
          {paginatedLogs.map((log) => (
            <Card
              key={log.id}
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() =>
                setExpandedLogId(expandedLogId === log.id ? null : log.id)
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Action Icon */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${actionColors[log.action] || "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400"}`}
                  >
                    {actionIcons[log.action] || "○"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${actionColors[log.action] || "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400"}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {log.resourceType}
                      </span>
                    </div>

                    <p className="font-medium text-foreground mb-1">
                      {log.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{log.userName}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                        {log.resourceId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand Button */}
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 mt-1 ${
                    expandedLogId === log.id ? "rotate-180" : ""
                  }`}
                />
              </div>

              {/* Expanded Details */}
              {expandedLogId === log.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-foreground mb-3">
                      Changes Made:
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(log.changes).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-start gap-3 text-sm"
                        >
                          <span className="text-muted-foreground font-mono min-w-max">
                            {key}:
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-foreground break-all">
                              {JSON.stringify(value)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>User ID:</strong> {log.userId}
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {new Date(log.timestamp).toISOString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

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
