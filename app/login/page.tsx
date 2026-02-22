import { LoginForm } from "./LoginForm";

// ISR - Revalidate login page hourly (mostly static content)
export const revalidate = 3600;

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <LoginForm />
    </div>
  );
}
