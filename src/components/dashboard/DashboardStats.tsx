import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Power, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardStatsProps {
  totalResponses: number;
  activeSurveys: number;
  expiredSurveys: number;
}

export const DashboardStats = ({ totalResponses, activeSurveys, expiredSurveys }: DashboardStatsProps) => {
  const { t } = useLanguage();

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("totalResponses")}</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalResponses}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("activeSurveys")}</CardTitle>
          <Power className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeSurveys}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("expiredSurveys")}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expiredSurveys}</div>
        </CardContent>
      </Card>
    </div>
  );
};
