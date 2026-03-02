"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Search, AlertCircle } from "lucide-react";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { useTranslation } from "@/app/context/LocaleContext";

interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export function AdminCategoriesTab() {
  const toast = useToast();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    let filtered = categories.filter(
      (cat) =>
        searchQuery === "" ||
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setFilteredCategories(filtered);
    setCurrentPage(1);
  }, [categories, searchQuery]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t.adminCategories.categoryNameRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingId) {
        // Update existing category
        const response = await fetch(`/api/admin/categories/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to update category");
        toast.create(t.adminCategories.categoryUpdated);
      } else {
        // Create new category
        const response = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create category");
        }
        toast.create(t.adminCategories.categoryCreated);
      }

      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.adminCategories.confirmDelete)) return;

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete category");
      toast.create(t.adminCategories.categoryDeleted);
      fetchCategories();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setEditingId(category._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  };

  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.adminCategories.title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {t.adminCategories.subtitle}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {t.adminCategories.addCategory}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t.adminCategories.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? t.adminCategories.editCategory : t.adminCategories.newCategory}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.adminCategories.categoryNameLabel}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder={t.adminCategories.categoryNamePlaceholder}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.adminCategories.descriptionOptional}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t.adminCategories.descriptionPlaceholder}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                {editingId ? t.common.update : t.common.create}
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                {t.common.cancel}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">{t.adminCategories.loading}</div>
        ) : paginatedCategories.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">{t.adminCategories.noCategories}</p>
          </Card>
        ) : (
          paginatedCategories.map((category) => (
            <Card key={category._id} className="p-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(category.createdAt || "").toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(category)}
                  className="gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  {t.common.edit}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(category._id)}
                  className="gap-1"
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
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            {t.common.previous}
          </Button>
          <span className="text-sm text-gray-600">
            {t.common.page} {currentPage} {t.common.of} {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            {t.common.next}
          </Button>
        </div>
      )}
    </div>
  );
}
