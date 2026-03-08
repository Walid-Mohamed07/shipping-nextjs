"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/context/AuthContext";
import { useTranslation } from "@/app/context/LocaleContext";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, CheckCircle, Mail, Phone, Loader2 } from "lucide-react";
import AddressForm from "@/app/components/AddressForm";
import ProfilePictureUpload from "@/app/components/ProfilePictureUpload";

interface Address {
  country: string;
  countryCode: string;
  street: string;
  building: string;
  city: string;
  district: string;
  governorate: string;
  postalCode: string;
  landmark: string;
  addressType: string;
  deliveryInstructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

type SignupStep = "account" | "otp" | "address";

export function SignupForm() {
  const [step, setStep] = useState<SignupStep>("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [address, setAddress] = useState<Address>({
    country: "",
    countryCode: "",
    street: "",
    building: "",
    city: "",
    district: "",
    governorate: "",
    postalCode: "",
    landmark: "",
    addressType: "Home",
    deliveryInstructions: "",
    coordinates: undefined,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // OTP states
  const [emailOTP, setEmailOTP] = useState("");
  const [mobileOTP, setMobileOTP] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [mobileOTPSent, setMobileOTPSent] = useState(false);
  const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
  const [sendingMobileOTP, setSendingMobileOTP] = useState(false);
  const [verifyingEmailOTP, setVerifyingEmailOTP] = useState(false);
  const [verifyingMobileOTP, setVerifyingMobileOTP] = useState(false);
  const [emailOTPExpiry, setEmailOTPExpiry] = useState<Date | null>(null);
  const [mobileOTPExpiry, setMobileOTPExpiry] = useState<Date | null>(null);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [mobileCountdown, setMobileCountdown] = useState(0);
  
  // Temporary user ID for OTP verification during signup
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  // Store OTPs temporarily during signup (for demo - remove in production)
  const [storedEmailOTP, setStoredEmailOTP] = useState<string | null>(null);
  const [storedMobileOTP, setStoredMobileOTP] = useState<string | null>(null);
  
  const { signup } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  useEffect(() => {
    if (mobileCountdown > 0) {
      const timer = setTimeout(() => setMobileCountdown(mobileCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [mobileCountdown]);

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return { valid: false, message: "Password must contain at least one special character (!@#$%^&*)" };
    }
    return { valid: true, message: "" };
  };

  const handleProfilePictureChange = (file: File | null) => {
    setProfilePicture(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePicturePreview(null);
    }
  };

  const uploadProfilePicture = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "users");

    const response = await fetch("/api/upload/profile", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload profile picture");
    }

    const data = await response.json();
    return data.url;
  };

  // Send OTP functions
  const sendEmailOTP = async () => {
    setSendingEmailOTP(true);
    setError("");
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          value: email,
          userId: tempUserId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email OTP");
      }

      setEmailOTPSent(true);
      setEmailOTPExpiry(new Date(data.expiresAt));
      setEmailCountdown(60); // 60 seconds cooldown
      // Store OTP for demo purposes (remove in production)
      if (data.otp) {
        setStoredEmailOTP(data.otp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email OTP");
    } finally {
      setSendingEmailOTP(false);
    }
  };

  const sendMobileOTP = async () => {
    setSendingMobileOTP(true);
    setError("");
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "mobile",
          value: mobile,
          userId: tempUserId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send mobile OTP");
      }

      setMobileOTPSent(true);
      setMobileOTPExpiry(new Date(data.expiresAt));
      setMobileCountdown(60); // 60 seconds cooldown
      // Store OTP for demo purposes (remove in production)
      if (data.otp) {
        setStoredMobileOTP(data.otp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send mobile OTP");
    } finally {
      setSendingMobileOTP(false);
    }
  };

  // Verify OTP functions (during signup, verify against stored OTP)
  const verifyEmailOTP = async () => {
    setVerifyingEmailOTP(true);
    setError("");
    try {
      // For signup flow, verify against stored OTP
      if (storedEmailOTP && emailOTP === storedEmailOTP) {
        setEmailVerified(true);
      } else {
        throw new Error("Invalid email OTP. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify email OTP");
    } finally {
      setVerifyingEmailOTP(false);
    }
  };

  const verifyMobileOTP = async () => {
    setVerifyingMobileOTP(true);
    setError("");
    try {
      // For signup flow, verify against stored OTP
      if (storedMobileOTP && mobileOTP === storedMobileOTP) {
        setMobileVerified(true);
      } else {
        throw new Error("Invalid mobile OTP. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify mobile OTP");
    } finally {
      setVerifyingMobileOTP(false);
    }
  };

  // Handle account info submission and proceed to OTP step
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !mobile) {
      setError("Please fill in all mandatory fields");
      return;
    }

    if (!profilePicture) {
      setError("Profile picture is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Move to OTP verification step
    setStep("otp");
  };

  // Final signup submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const profilePictureUrl = await uploadProfilePicture(profilePicture!);

      await signup(
        email,
        password,
        fullName,
        email.split("@")[0] + Date.now(),
        mobile,
        profilePictureUrl,
        birthDate,
        address,
        emailVerified,
        mobileVerified,
      );

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        <div className={`flex items-center ${step === "account" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "account" ? "border-primary bg-primary text-white" : step !== "account" ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground"}`}>
            {step !== "account" ? <CheckCircle className="w-5 h-5" /> : "1"}
          </div>
          <span className="ml-2 text-sm font-medium">{t.signup.accountInfo || "Account"}</span>
        </div>
        <div className="w-12 h-0.5 bg-muted" />
        <div className={`flex items-center ${step === "otp" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "otp" ? "border-primary bg-primary text-white" : step === "address" ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground"}`}>
            {step === "address" ? <CheckCircle className="w-5 h-5" /> : "2"}
          </div>
          <span className="ml-2 text-sm font-medium">{t.signup.verification || "Verification"}</span>
        </div>
        <div className="w-12 h-0.5 bg-muted" />
        <div className={`flex items-center ${step === "address" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "address" ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">{t.signup.deliveryAddress || "Address"}</span>
        </div>
      </div>
    </div>
  );

  // Render OTP verification step
  const renderOTPStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t.signup.verifyIdentity || "Verify Your Identity"}
        </h2>
        <p className="text-muted-foreground">
          {t.signup.verifyDescription || "Please verify your email and mobile number to continue"}
        </p>
      </div>

      {/* Email Verification */}
      <div className={`p-6 rounded-lg border ${emailVerified ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-border"}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${emailVerified ? "bg-green-500" : "bg-primary/10"}`}>
            {emailVerified ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <Mail className={`w-5 h-5 ${emailVerified ? "text-white" : "text-primary"}`} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{t.signup.emailVerification || "Email Verification"}</h3>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          {emailVerified && (
            <span className="text-green-600 text-sm font-medium">{t.common.verified || "Verified"}</span>
          )}
        </div>

        {!emailVerified && (
          <div className="space-y-3">
            {!emailOTPSent ? (
              <Button
                type="button"
                onClick={sendEmailOTP}
                disabled={sendingEmailOTP}
                className="w-full cursor-pointer"
              >
                {sendingEmailOTP ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.signup.sendingOTP || "Sending..."}
                  </>
                ) : (
                  t.signup.sendOTP || "Send Verification Code"
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={t.signup.enterOTP || "Enter 6-digit code"}
                    value={emailOTP}
                    onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="flex-1 text-center tracking-widest text-lg"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    onClick={verifyEmailOTP}
                    disabled={verifyingEmailOTP || emailOTP.length !== 6}
                    className="cursor-pointer"
                  >
                    {verifyingEmailOTP ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t.signup.verify || "Verify"
                    )}
                  </Button>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {t.signup.didntReceiveCode || "Didn't receive the code?"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={sendEmailOTP}
                    disabled={emailCountdown > 0 || sendingEmailOTP}
                    className="cursor-pointer"
                  >
                    {emailCountdown > 0 ? `${t.signup.resendIn || "Resend in"} ${emailCountdown}s` : t.signup.resendOTP || "Resend"}
                  </Button>
                </div>
                {/* Demo helper - remove in production */}
                {storedEmailOTP && process.env.NODE_ENV !== "production" && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    Demo OTP: {storedEmailOTP}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Verification */}
      <div className={`p-6 rounded-lg border ${mobileVerified ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-border"}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mobileVerified ? "bg-green-500" : "bg-primary/10"}`}>
            {mobileVerified ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <Phone className={`w-5 h-5 ${mobileVerified ? "text-white" : "text-primary"}`} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{t.signup.mobileVerification || "Mobile Verification"}</h3>
            <p className="text-sm text-muted-foreground">{mobile}</p>
          </div>
          {mobileVerified && (
            <span className="text-green-600 text-sm font-medium">{t.common.verified || "Verified"}</span>
          )}
        </div>

        {!mobileVerified && (
          <div className="space-y-3">
            {!mobileOTPSent ? (
              <Button
                type="button"
                onClick={sendMobileOTP}
                disabled={sendingMobileOTP}
                className="w-full cursor-pointer"
              >
                {sendingMobileOTP ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.signup.sendingOTP || "Sending..."}
                  </>
                ) : (
                  t.signup.sendOTP || "Send Verification Code"
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={t.signup.enterOTP || "Enter 6-digit code"}
                    value={mobileOTP}
                    onChange={(e) => setMobileOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="flex-1 text-center tracking-widest text-lg"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    onClick={verifyMobileOTP}
                    disabled={verifyingMobileOTP || mobileOTP.length !== 6}
                    className="cursor-pointer"
                  >
                    {verifyingMobileOTP ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t.signup.verify || "Verify"
                    )}
                  </Button>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {t.signup.didntReceiveCode || "Didn't receive the code?"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={sendMobileOTP}
                    disabled={mobileCountdown > 0 || sendingMobileOTP}
                    className="cursor-pointer"
                  >
                    {mobileCountdown > 0 ? `${t.signup.resendIn || "Resend in"} ${mobileCountdown}s` : t.signup.resendOTP || "Resend"}
                  </Button>
                </div>
                {/* Demo helper - remove in production */}
                {storedMobileOTP && process.env.NODE_ENV !== "production" && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    Demo OTP: {storedMobileOTP}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("account")}
          className="flex-1 cursor-pointer"
        >
          {t.common.back || "Back"}
        </Button>
        <Button
          type="button"
          onClick={() => setStep("address")}
          disabled={!emailVerified || !mobileVerified}
          className="flex-1 cursor-pointer"
        >
          {t.common.continue || "Continue"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t.signup.createAccount}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t.signup.joinShipHub}
        </p>

        {renderStepIndicator()}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {step === "account" && (
          <form onSubmit={handleAccountSubmit} className="space-y-6" suppressHydrationWarning>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t.signup.accountInfo}
              </h2>

              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t.signup.fullName} *
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t.signup.emailAddress} *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t.signup.mobileNumber} *
                </label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+201234567890"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <ProfilePictureUpload
                value={profilePicture}
                onChange={handleProfilePictureChange}
                preview={profilePicturePreview}
              />

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t.signup.password} *
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t.signup.passwordRequirements}
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t.signup.confirmPassword} *
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="birthDate"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t.signup.birthDate}
                </label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full cursor-pointer text-base py-2 h-auto"
            >
              {t.common.continue || "Continue to Verification"}
            </Button>
          </form>
        )}

        {step === "otp" && renderOTPStep()}

        {step === "address" && (
          <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {t.signup.deliveryAddress}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t.signup.addressOptional || "This step is optional. You can add an address later."}
              </p>
              <AddressForm
                value={address}
                onChange={setAddress}
                isOptional={true}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("otp")}
                className="flex-1 cursor-pointer"
              >
                {t.common.back || "Back"}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 cursor-pointer text-base py-2 h-auto"
              >
                {isLoading ? t.signup.creatingAccount : t.signup.createAccount}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t.signup.alreadyHaveAccount}{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            {t.signup.signInHere}
          </Link>
        </div>
      </div>
    </div>
  );
}
