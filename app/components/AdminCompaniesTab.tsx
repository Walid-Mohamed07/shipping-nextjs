"use client";

import React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Search } from "lucide-react";
import { Company } from "@/types";

export function AdminCompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "date">("name");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    email: "",
    phoneNumber: "",
    address: "",
    rate: "4.50",
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    let filtered = companies.filter(
      (company) =>
        searchQuery === "" ||
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "rating") {
        return parseFloat(b.rate) - parseFloat(a.rate);
      } else if (sortBy === "date") {
        return 0;
      }
      return 0;
    });

    setFilteredCompanies(filtered);
    setCurrentPage(1);
  }, [companies, searchQuery, sortBy]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/admin/companies");
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch("/api/admin/companies", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchCompanies();
        resetForm();
        alert(editingId ? "Company updated" : "Company created");
      }
    } catch (error) {
      console.error("Failed to save company:", error);
      alert("Failed to save company");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      const res = await fetch(`/api/admin/companies?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCompanies();
        alert("Company deleted");
      }
    } catch (error) {
      console.error("Failed to delete company:", error);
      alert("Failed to delete company");
    }
  };

  const handleEdit = (company: Company) => {
    setFormData({
      name: company.name,
      email: company.email,
      phoneNumber: company.phoneNumber,
      address: company.address,
      rate: company.rate,
      category: company.category || "",
    });
    setEditingId(company.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phoneNumber: "",
      address: "",
      category: "",
      rate: "4.50",
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Shipping Companies</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCompanies.length} companies
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-primary/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                  placeholder="e.g., FedEx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                  placeholder="info@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                  placeholder="+201112223333"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                  placeholder="123 Business St, Cairo, Egypt"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? "Update" : "Create"} Company
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

      {/* Search and Sort */}
      <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 md:col-span-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by company name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
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
              <option value="rating">Rating (High to Low)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedCompanies.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No companies found matching your search
          </div>
        ) : (
          paginatedCompanies.map((company) => (
            <Card key={company.id} className="p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{company.name}</h3>
                <p className="text-sm text-muted-foreground">
                  ⭐ {company.rate} rating
                </p>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {company.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  {company.phoneNumber}
                </p>
                <p>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  {company.address}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(company)}
                  className="flex-1 gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(company.id)}
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </Card>
          ))
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
