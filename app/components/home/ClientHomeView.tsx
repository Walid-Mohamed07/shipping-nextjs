"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Globe, Zap, Shield, ArrowRight } from "lucide-react";
import { useTranslation } from "@/app/context/LocaleContext";

export function ClientHomeView() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleShipNow = () => {
    router.push("/new-request");
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
      <div className="text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
          {t.home.heroTitle}
          <span className="block text-primary">{t.home.heroHighlight}</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {t.home.heroDescription}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button
            size="lg"
            onClick={handleShipNow}
            className="gap-2 text-base px-8 cursor-pointer"
          >
            {t.home.shipNow}
            <ArrowRight className="w-5 h-5 rtl:rotate-180" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 bg-transparent cursor-pointer"
          >
            {t.common.learnMore}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white justify-items-center dark:bg-slate-950 rounded-lg p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {t.home.globalCoverage}
            </h3>
            <p className="text-muted-foreground">
              {t.home.globalCoverageDesc}
            </p>
          </div>

          <div className="bg-white justify-items-center dark:bg-slate-950 rounded-lg p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {t.home.fastDelivery}
            </h3>
            <p className="text-muted-foreground">
              {t.home.fastDeliveryDesc}
            </p>
          </div>

          <div className="bg-white justify-items-center dark:bg-slate-950 rounded-lg p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {t.home.secureAndSafe}
            </h3>
            <p className="text-muted-foreground">
              {t.home.secureAndSafeDesc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
