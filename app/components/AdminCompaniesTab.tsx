"use client";

import React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus } from "lucide-react";
import { Company } from "@/types";

export function AdminCompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Shipping Companies</h2>
          <p className="text-sm text-muted-foreground">
            {companies.length} companies
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((company) => (
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
        ))}
      </div>
    </div>
  );
}
