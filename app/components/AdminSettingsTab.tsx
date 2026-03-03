"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Save, AlertCircle, Percent, DollarSign, Info } from "lucide-react";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { useTranslation } from "@/app/context/LocaleContext";

interface Settings {
  headoverPercentage: number;
  lastUpdatedBy?: {
    userId: string;
    userName: string;
    updatedAt: string;
  };
  updatedAt?: string;
}

export function AdminSettingsTab() {
  const toast = useToast();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [headoverPercentage, setHeadoverPercentage] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      setSettings(data.settings);
      setHeadoverPercentage(data.settings.headoverPercentage?.toString() || "0");
    } catch (error) {
      setError(getErrorMessage(error));
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const percentage = parseFloat(headoverPercentage);
      
      if (isNaN(percentage)) {
        setError(t.adminSettings?.invalidPercentage || "Please enter a valid percentage");
        toast.error(t.adminSettings?.invalidPercentage || "Please enter a valid percentage");
        return;
      }

      if (percentage < 0 || percentage > 100) {
        setError(t.adminSettings?.percentageRange || "Percentage must be between 0 and 100");
        toast.error(t.adminSettings?.percentageRange || "Percentage must be between 0 and 100");
        return;
      }

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headoverPercentage: percentage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      const data = await response.json();
      setSettings(data.settings);
      setIsDirty(false);
      toast.create(t.adminSettings?.savedSuccessfully || "Settings saved successfully");
    } catch (error) {
      setError(getErrorMessage(error));
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handlePercentageChange = (value: string) => {
    setHeadoverPercentage(value);
    setIsDirty(true);
    setError(null);
  };

  // Calculate example prices
  const exampleCompanyPrice = 100;
  const calculatedFinalPrice = exampleCompanyPrice * (1 + (parseFloat(headoverPercentage) || 0) / 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {t.adminSettings?.title || "System Settings"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t.adminSettings?.description || "Configure system-wide settings for the platform"}
        </p>
      </div>

      {/* Headover Percentage Card */}
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t.adminSettings?.headoverTitle || "Headover Percentage (Markup)"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t.adminSettings?.headoverDescription || "This percentage is added to company offers when displayed to clients. For example, if a company offers $60 and headover is 5%, the client will see $63."}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Input Field */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="headoverPercentage" className="text-sm font-medium">
                {t.adminSettings?.headoverLabel || "Headover Percentage"}
              </label>
              <div className="relative">
                <Input
                  id="headoverPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={headoverPercentage}
                  onChange={(e) => handlePercentageChange(e.target.value)}
                  className="pr-10"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.adminSettings?.headoverHint || "Enter a value between 0 and 100"}
              </p>
            </div>

            {/* Live Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t.adminSettings?.previewLabel || "Price Preview"}
              </label>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t.adminSettings?.previewHint || "Example calculation"}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t.adminSettings?.companyOffer || "Company Offer:"}
                    </span>
                    <span className="font-medium">${exampleCompanyPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t.adminSettings?.headoverAmount || "Headover"} ({headoverPercentage || 0}%):
                    </span>
                    <span className="font-medium text-primary">
                      +${(calculatedFinalPrice - exampleCompanyPrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">
                        {t.adminSettings?.clientSees || "Client Sees:"}
                      </span>
                      <span className="font-bold text-lg text-primary">
                        ${calculatedFinalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Last Updated Info */}
          {settings?.lastUpdatedBy && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
              {t.adminSettings?.lastUpdated || "Last updated by"}{" "}
              <span className="font-medium">{settings.lastUpdatedBy.userName}</span>{" "}
              {t.adminSettings?.on || "on"}{" "}
              {new Date(settings.lastUpdatedBy.updatedAt).toLocaleString()}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="min-w-30"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t.common?.saving || "Saving..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t.common?.save || "Save"}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
