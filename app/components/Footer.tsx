"use client";

import { useTranslation } from "@/app/context/LocaleContext";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} {t.common.allRightsReserved}
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.common.privacyPolicy}
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.common.termsOfService}
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.common.contactUs}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
