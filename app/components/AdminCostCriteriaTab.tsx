"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Save, X, AlertCircle, History } from "lucide-react";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { useTranslation } from "@/app/context/LocaleContext";

interface CategoryRate {
  category: string;
  baseRate: number;
}

interface CostCriteria {
  _id?: string;
  categoryRates: CategoryRate[];
  weightMultiplier: number;
  quantityMultiplier: number;
  sameLocationMultiplier: number;
  differentLocationMultiplier: number;
  urgentDeliverySurcharge: number;
  minPrice: number;
  maxPrice: number | null;
  isActive: boolean;
  version: number;
  createdAt?: string;
}

export function AdminCostCriteriaTab() {
  const toast = useToast();
  const { t } = useTranslation();
  const [costCriteria, setCostCriteria] = useState<CostCriteria | null>(null);
  const [formData, setFormData] = useState<CostCriteria>({
    categoryRates: [],
    weightMultiplier: 1,
    quantityMultiplier: 1,
    sameLocationMultiplier: 1,
    differentLocationMultiplier: 1.5,
    urgentDeliverySurcharge: 1.25,
    minPrice: 0,
    maxPrice: null,
    isActive: true,
    version: 1,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCategoryRate, setNewCategoryRate] = useState({ category: "", baseRate: "" });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<CostCriteria[]>([]);

  useEffect(() => {
    fetchCostCriteria();
  }, []);

  const fetchCostCriteria = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cost-criteria");
      if (!response.ok) throw new Error("Failed to fetch cost criteria");
      const data = await response.json();
      setCostCriteria(data.costCriteria);
      setFormData(data.costCriteria);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/admin/cost-criteria/history");
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleShowHistory = () => {
    if (history.length === 0) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (formData.categoryRates.length === 0) {
      newErrors.categoryRates = t.adminCostCriteria.categoryRatesRequired;
    }

    if (formData.weightMultiplier <= 0) {
      newErrors.weightMultiplier = t.adminCostCriteria.mustBeGreaterThan0;
    }

    if (formData.quantityMultiplier <= 0) {
      newErrors.quantityMultiplier = t.adminCostCriteria.mustBeGreaterThan0;
    }

    if (formData.minPrice < 0) {
      newErrors.minPrice = t.adminCostCriteria.mustBe0OrGreater;
    }

    if (formData.maxPrice && formData.maxPrice < formData.minPrice) {
      newErrors.maxPrice = t.adminCostCriteria.mustBeGreaterThanMin;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCategoryRate = () => {
    if (!newCategoryRate.category.trim() || !newCategoryRate.baseRate) {
      toast.error(t.adminCostCriteria.fillCategoryAndRate);
      return;
    }

    const rate = parseFloat(newCategoryRate.baseRate);
    if (isNaN(rate) || rate < 0) {
      toast.error(t.adminCostCriteria.baseRateMustBeValid);
      return;
    }

    // Check if category already exists
    if (formData.categoryRates.some((r) => r.category === newCategoryRate.category)) {
      toast.error(t.adminCostCriteria.categoryAlreadyHasRate);
      return;
    }

    setFormData({
      ...formData,
      categoryRates: [
        ...formData.categoryRates,
        { category: newCategoryRate.category, baseRate: rate },
      ],
    });
    setNewCategoryRate({ category: "", baseRate: "" });
  };

  const handleRemoveCategoryRate = (index: number) => {
    setFormData({
      ...formData,
      categoryRates: formData.categoryRates.filter((_, i) => i !== index),
    });
  };

  const handleUpdateCategoryRate = (
    index: number,
    field: "category" | "baseRate",
    value: string
  ) => {
    const updated = [...formData.categoryRates];
    if (field === "baseRate") {
      updated[index].baseRate = parseFloat(value) || 0;
    } else {
      updated[index].category = value;
    }
    setFormData({ ...formData, categoryRates: updated });
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch("/api/admin/cost-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save cost criteria");

      const data = await response.json();
      setCostCriteria(data.costCriteria);
      setIsEditing(false);
      toast.create(t.adminCostCriteria.costCriteriaUpdated);
      fetchHistory();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(costCriteria || {
      categoryRates: [],
      weightMultiplier: 1,
      quantityMultiplier: 1,
      sameLocationMultiplier: 1,
      differentLocationMultiplier: 1.5,
      urgentDeliverySurcharge: 1.25,
      minPrice: 0,
      maxPrice: null,
      isActive: true,
      version: 1,
    });
    setErrors({});
  };

  if (loading) {
    return <div className="text-center py-8">{t.adminCostCriteria.loading}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.adminCostCriteria.title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {t.adminCostCriteria.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleShowHistory}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History (v{costCriteria?.version || 1})
          </Button>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t.adminCostCriteria.editCriteria}
            </Button>
          )}
        </div>
      </div>

      {/* History Section */}
      {showHistory && (
        <Card className="p-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t.adminCostCriteria.versionHistory}</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-gray-600">{t.adminCostCriteria.noHistory}</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((version) => (
                <div
                  key={version._id}
                  className="p-3 bg-white rounded border border-blue-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.adminCostCriteria.version} {version.version}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        version.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {version.isActive ? t.adminCostCriteria.activeVersion : t.adminCostCriteria.inactiveVersion}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(version.createdAt || "").toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t.adminCostCriteria.categoriesCount.replace('{count}', String(version.categoryRates.length))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Category Rates Section */}
      <Card className={`p-6 ${isEditing ? "border-2 border-blue-200 bg-blue-50" : ""}`}>
        <h3 className="text-lg font-semibold mb-4">{t.adminCostCriteria.categoryRates}</h3>

        {errors.categoryRates && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {errors.categoryRates}
          </div>
        )}

        <div className="space-y-3 mb-4">
          {formData.categoryRates.map((rate, index) => (
            <div key={index} className="flex gap-2 items-center">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={rate.category}
                    onChange={(e) =>
                      handleUpdateCategoryRate(index, "category", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    placeholder="Category name"
                  />
                  <input
                    type="number"
                    value={rate.baseRate}
                    onChange={(e) =>
                      handleUpdateCategoryRate(index, "baseRate", e.target.value)
                    }
                    className="w-24 px-3 py-2 border border-gray-300 rounded"
                    placeholder="Base rate"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveCategoryRate(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium text-gray-900">
                    {rate.category}
                  </span>
                  <span className="text-gray-600 font-semibold">
                    ${rate.baseRate.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {isEditing && (
          <div className="flex gap-2 p-4 bg-white rounded border-2 border-dashed border-gray-300">
            <input
              type="text"
              value={newCategoryRate.category}
              onChange={(e) =>
                setNewCategoryRate({ ...newCategoryRate, category: e.target.value })
              }
              placeholder={t.adminCostCriteria.categoryName}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="number"
              value={newCategoryRate.baseRate}
              onChange={(e) =>
                setNewCategoryRate({ ...newCategoryRate, baseRate: e.target.value })
              }
              placeholder={t.adminCostCriteria.baseRate}
              className="w-24 px-3 py-2 border border-gray-300 rounded"
            />
            <Button onClick={handleAddCategoryRate} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Multipliers Section */}
      <Card className={`p-6 ${isEditing ? "border-2 border-blue-200 bg-blue-50" : ""}`}>
        <h3 className="text-lg font-semibold mb-4">{t.adminCostCriteria.multipliersTitle}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.adminCostCriteria.weightMultiplier}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.weightMultiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weightMultiplier: parseFloat(e.target.value) || 0,
                  })
                }
                className={`w-full px-3 py-2 border rounded ${
                  errors.weightMultiplier ? "border-red-500" : "border-gray-300"
                }`}
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {formData.weightMultiplier}x
              </div>
            )}
            {errors.weightMultiplier && (
              <p className="text-red-600 text-sm mt-1">{errors.weightMultiplier}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.adminCostCriteria.quantityMultiplier}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.quantityMultiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantityMultiplier: parseFloat(e.target.value) || 0,
                  })
                }
                className={`w-full px-3 py-2 border rounded ${
                  errors.quantityMultiplier ? "border-red-500" : "border-gray-300"
                }`}
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {formData.quantityMultiplier}x
              </div>
            )}
            {errors.quantityMultiplier && (
              <p className="text-red-600 text-sm mt-1">{errors.quantityMultiplier}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.adminCostCriteria.sameLocationMultiplier}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.sameLocationMultiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sameLocationMultiplier: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {formData.sameLocationMultiplier}x
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.adminCostCriteria.differentLocationMultiplier}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.differentLocationMultiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    differentLocationMultiplier: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {formData.differentLocationMultiplier}x
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.adminCostCriteria.urgentDeliverySurcharge}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.urgentDeliverySurcharge}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    urgentDeliverySurcharge: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {(formData.urgentDeliverySurcharge * 100).toFixed(0)}% {t.adminCostCriteria.extra}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.adminCostCriteria.minimumPrice}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.minPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minPrice: parseFloat(e.target.value) || 0,
                  })
                }
                className={`w-full px-3 py-2 border rounded ${
                  errors.minPrice ? "border-red-500" : "border-gray-300"
                }`}
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                ${formData.minPrice.toFixed(2)}
              </div>
            )}
            {errors.minPrice && (
              <p className="text-red-600 text-sm mt-1">{errors.minPrice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.adminCostCriteria.maximumPrice}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={formData.maxPrice || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxPrice: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className={`w-full px-3 py-2 border rounded ${
                  errors.maxPrice ? "border-red-500" : "border-gray-300"
                }`}
                placeholder={t.adminCostCriteria.leaveEmptyUnlimited}
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {formData.maxPrice ? `$${formData.maxPrice.toFixed(2)}` : t.adminCostCriteria.unlimited}
              </div>
            )}
            {errors.maxPrice && (
              <p className="text-red-600 text-sm mt-1">{errors.maxPrice}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-2">
          <Button onClick={handleSave} className="gap-2 flex-1">
            <Save className="w-4 h-4" />
            {t.adminCostCriteria.saveChanges}
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            {t.common.cancel}
          </Button>
        </div>
      )}
    </div>
  );
}
