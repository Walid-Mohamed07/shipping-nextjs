import { Header } from "./components/Header";
import { HomeContent } from "./components/home/HomeContent";

// ISR - Revalidate every 60 seconds (1 minute) for user-specific content
export const revalidate = 60;

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50 dark:to-slate-900">
      <Header />
      <HomeContent />
    </div>
  );
}
