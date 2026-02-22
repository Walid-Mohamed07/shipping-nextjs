import { SignupForm } from "./SignupForm";

// ISR - Revalidate signup page hourly (mostly static content)
export const revalidate = 3600;

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background">
      <SignupForm />
    </div>
  );
}
