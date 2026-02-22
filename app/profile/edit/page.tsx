"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { toast, Toaster } from "sonner";
import { ArrowLeft, Upload, Loader } from "lucide-react";
import Link from "next/link";

export default function EditProfilePage() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const { isLoading: authLoading } = useProtectedRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    birthDate: "",
    profilePicture: "",
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || authLoading) {
      return;
    }

    // Initialize form with user data
    setFormData({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      birthDate: user.birthDate ? user.birthDate.split("T")[0] : "",
      profilePicture: user.profilePicture || "",
    });

    if (user.profilePicture) {
      setPreviewImage(user.profilePicture);
    }
  }, [user, authLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setTimeout(() => toast.error("Image size must be less than 5MB"), 0);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setTimeout(() => toast.error("Please upload an image file"), 0);
      return;
    }

    try {
      setIsUploadingImage(true);

      // Read file as data URL for preview
      const previewUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload file to server
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("folder", "profile-pictures");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      const imageUrl = data.url;

      // Update state once after both operations complete
      setPreviewImage(previewUrl);
      setFormData((prev) => ({
        ...prev,
        profilePicture: imageUrl,
      }));
      setTimeout(() => toast.success("Image uploaded successfully"), 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload image";
      setTimeout(() => toast.error(errorMessage), 0);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user?._id) {
        throw new Error("User ID not found");
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();

      // Update auth context with new user data
      if (data.user) {
        setUser(data.user);
      }

      setTimeout(() => {
        toast.success("Profile updated successfully");
        router.push("/profile");
      }, 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      setTimeout(() => toast.error(errorMessage), 0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/profile">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent cursor-pointer mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Button>
        </Link>

        {authLoading ? (
          <div className="bg-card rounded-lg border border-border p-8 space-y-6">
            <div className="h-10 bg-muted rounded w-1/3 animate-pulse" />
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 rounded-full bg-muted animate-pulse" />
              <div className="w-full space-y-3">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
                  <div className="h-10 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-8">
            <h1 className="text-3xl font-bold text-foreground mb-8">
              Edit Profile
            </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Profile Preview"
                    className="w-32 h-32 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary border-dashed">
                    <Upload className="w-8 h-8 text-primary opacity-50" />
                  </div>
                )}
                <label
                  htmlFor="profilePicture"
                  className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary/90 transition"
                >
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    id="profilePicture"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Click the camera icon to upload a new profile picture
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: JPG, PNG (Max 5MB)
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your email"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your mobile number"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-border">
              <Link href="/profile" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent cursor-pointer"
                >
                  Cancel
                </Button>
              </Link>
              <button
                type="submit"
                disabled={isLoading || isUploadingImage}
                className="flex-1 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
          </div>
        )}
      </div>
    </div>
  );
}
