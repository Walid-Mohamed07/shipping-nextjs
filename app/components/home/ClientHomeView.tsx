"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Globe, Zap, Shield, ArrowRight } from "lucide-react";

export function ClientHomeView() {
  const router = useRouter();

  const handleShipNow = () => {
    router.push("/new-request");
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
      <div className="text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
          Ship Your Packages
          <span className="block text-primary">Anywhere in the World</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Fast, reliable, and affordable shipping services. Track your
          shipments in real-time and enjoy hassle-free delivery to over 200
          countries.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button
            size="lg"
            onClick={handleShipNow}
            className="gap-2 text-base px-8 cursor-pointer"
          >
            Ship Now
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 bg-transparent cursor-pointer"
          >
            Learn More
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white justify-items-center dark:bg-slate-950 rounded-lg p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Global Coverage
            </h3>
            <p className="text-muted-foreground">
              Ship to over 200 countries and territories worldwide with our
              extensive network.
            </p>
          </div>

          <div className="bg-white justify-items-center dark:bg-slate-950 rounded-lg p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Fast Delivery
            </h3>
            <p className="text-muted-foreground">
              Get your packages delivered quickly with our optimized logistics
              network.
            </p>
          </div>

          <div className="bg-white justify-items-center dark:bg-slate-950 rounded-lg p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Secure & Safe
            </h3>
            <p className="text-muted-foreground">
              Your packages are fully insured and handled with care every step
              of the way.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
