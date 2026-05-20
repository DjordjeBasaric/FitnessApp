"use client";

import { ExportPdfMenu } from "@/components/export/ExportPdfMenu";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function PodesavanjaView() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        kicker={t("nav.settings")}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher className="flex-col items-start gap-3 sm:flex-row sm:items-center" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.export")}</CardTitle>
            <CardDescription>{t("settings.exportHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExportPdfMenu className="w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
