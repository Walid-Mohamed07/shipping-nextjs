"use client";

import React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Search } from "lucide-react";
import { Company } from "@/types";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { useTranslation } from "@/app/context/LocaleContext";

export function AdminCompaniesTab() {
  const toast = useToast();
  const { t } = useTranslation();
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
    rate: 4.5,
    logo: "",
    logoFile: null as File | null,
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
        return b.rate - a.rate;
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
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("phoneNumber", formData.phoneNumber);
      formDataToSend.append("rate", formData.rate.toString());
      formDataToSend.append("address", formData.address);
      formDataToSend.append("category", formData.category);

      // Handle logo file
      if (formData.logoFile) {
        formDataToSend.append("logo", formData.logoFile);
      }

      // If updating and logo exists, pass existing path for cleanup
      if (editingId && formData.logo && !formData.logoFile) {
        formDataToSend.append("existingLogo", formData.logo);
      } else if (editingId && formData.logo) {
        formDataToSend.append("existingLogo", formData.logo);
      }

      if (editingId) {
        formDataToSend.append("id", editingId);
      }

      const method = editingId ? "PUT" : "POST";

      const res = await fetch("/api/admin/companies", {
        method,
        body: formDataToSend,
      });

      if (res.ok) {
        fetchCompanies();
        resetForm();
        toast.create(
          editingId
            ? t.adminCompanies.companyUpdated
            : t.adminCompanies.companyCreated,
        );
      } else {
        toast.error(t.adminCompanies.failedSave);
      }
    } catch (error) {
      console.error("Failed to save company:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.adminCompanies.confirmDelete)) return;

    try {
      const res = await fetch(`/api/admin/companies?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCompanies();
        toast.delete(t.adminCompanies.companyDeleted);
      } else {
        toast.error(t.adminCompanies.failedDelete);
      }
    } catch (error) {
      console.error("Failed to delete company:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, logoFile: file });
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
      logo: company.logo || "",
      logoFile: null,
    });
    setEditingId(company._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phoneNumber: "",
      address: "",
      category: "",
      rate: 4.5,
      logo: "",
      logoFile: null,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading)
    return <div className="text-center py-8">{t.common.loading}</div>;

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
          <h2 className="text-xl font-semibold">{t.adminCompanies.title}</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCompanies.length} companies
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t.adminCompanies.addCompany}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-primary/50">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Company" : "Create Company"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t.adminCompanies.companyName}
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
                <label className="block text-sm font-medium mb-1">
                  {t.common.email}
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  {t.common.phone}
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  {t.adminCompanies.rating}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Company Logo{" "}
                  <span className="text-xs text-muted-foreground">
                    (Optional)
                  </span>
                </label>
                <div className="flex gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="flex-1 px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
                  />
                  {(formData.logoFile || formData.logo) && (
                    <div className="w-12 h-12 rounded border border-border overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                      <img
                        src={
                          formData.logoFile
                            ? URL.createObjectURL(formData.logoFile)
                            : formData.logo
                        }
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
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
                {editingId
                  ? t.adminCompanies.updateCompany
                  : t.adminCompanies.createCompany}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1 bg-transparent"
              >
                {t.common.cancel}
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
              placeholder={t.adminCompanies.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t.adminCompanies.sortBy}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
            >
              <option value="name">{t.adminCompanies.nameAZ}</option>
              <option value="rating">{t.adminCompanies.ratingHighLow}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedCompanies.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {t.adminCompanies.noCompaniesMatch}
          </div>
        ) : (
          paginatedCompanies.map((company) => (
            <Card key={company._id} className="p-4">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    ⭐ {company.rate} {t.adminCompanies.ratingLabel}
                  </p>
                </div>
                {company.logo && (
                  <div className="w-12 h-12 rounded border border-border overflow-hidden bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    <img
                      src={company.logo}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm mb-4">
                <p>
                  <span className="text-muted-foreground">
                    {t.common.email}:
                  </span>{" "}
                  {company.email}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {t.common.phone}:
                  </span>{" "}
                  {company.phoneNumber}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {t.common.address}:
                  </span>{" "}
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
                  {t.common.edit}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(company._id)}
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t.common.delete}
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
                  key={`page-${pageNum}`}
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
