import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Calendar as CalendarIcon, Copy, ExternalLink, Eye, Power, PowerOff, 
  Trash2, Clock, Mail, QrCode, Edit, Users, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  share_token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  response_count?: number;
  visible_in_community?: boolean;
  responses_public?: boolean;
  status?: string;
}

interface SurveyCardProps {
  survey: Survey;
  isEditingTitle: boolean;
  editingTitleValue: string;
  onEditTitleChange: (value: string) => void;
  onStartEditTitle: () => void;
  onSaveTitle: () => void;
  onCancelEditTitle: () => void;
  onCopyLink: () => void;
  onQrCode: () => void;
  onShareEmail: () => void;
  onShareWhatsApp: () => void;
  onView: () => void;
  onViewResponses: () => void;
  onToggleActive: () => void;
  onExtendExpiry: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onFindParticipants: () => void;
}

const isSurveyExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

export const SurveyCard = ({
  survey,
  isEditingTitle,
  editingTitleValue,
  onEditTitleChange,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onCopyLink,
  onQrCode,
  onShareEmail,
  onShareWhatsApp,
  onView,
  onViewResponses,
  onToggleActive,
  onExtendExpiry,
  onDelete,
  onEdit,
  onFindParticipants,
}: SurveyCardProps) => {
  const { t } = useLanguage();
  const expired = isSurveyExpired(survey.expires_at);
  
  // Check if survey can be shared (must be published, active, and not expired)
  const canShare = survey.status === 'published' && survey.is_active && !expired;
  
  const handleShareClick = (action: () => void) => {
    if (!canShare) {
      toast.error("Prima attiva il questionario per ottenere un link condivisibile.");
      return;
    }
    action();
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {isEditingTitle ? (
              <Input
                value={editingTitleValue}
                onChange={(e) => onEditTitleChange(e.target.value)}
                onBlur={onSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSaveTitle();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelEditTitle();
                  }
                }}
                autoFocus
                className="text-xl font-semibold mb-2 h-auto py-1"
              />
            ) : (
              <CardTitle 
                className="text-xl mb-2 cursor-pointer hover:text-primary transition-colors"
                onClick={onStartEditTitle}
              >
                {survey.title || t("untitledDraft")}
              </CardTitle>
            )}
            <CardDescription className="line-clamp-2">
              {survey.description || "No description"}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            {survey.is_active && !expired && (
              <Badge variant="default">{t("active")}</Badge>
            )}
            {!survey.is_active && (
              <Badge variant="secondary">{t("inactive")}</Badge>
            )}
            {expired && (
              <Badge variant="destructive">{t("expired")}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{t("createdOn")} {format(new Date(survey.created_at), "PPP")}</span>
            </div>
            {survey.expires_at && (
              <div className="flex items-center gap-2 mt-1">
                <CalendarIcon className="h-4 w-4" />
                <span className={expired ? "text-destructive" : ""}>
                  {t("expiresOn")} {format(new Date(survey.expires_at), "PPP")}
                </span>
              </div>
            )}
            {!survey.expires_at && (
              <div className="flex items-center gap-2 mt-1">
                <CalendarIcon className="h-4 w-4" />
                <span>{t("noExpiration")}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold">{survey.response_count}</span> {t("responses")}
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              {survey.visible_in_community && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  Community
                </Badge>
              )}
              {survey.responses_public && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Eye className="h-3 w-3" />
                  Pubbliche
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleShareClick(onCopyLink)}
              className={!canShare ? "opacity-50" : ""}
            >
              <Copy className="h-4 w-4 mr-1" />
              {t("copyLink")}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleShareClick(onQrCode)}
              className={!canShare ? "opacity-50" : ""}
            >
              <QrCode className="h-4 w-4 mr-1" />
              QR Code
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleShareClick(onShareEmail)}
              className={!canShare ? "opacity-50" : ""}
            >
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleShareClick(onShareWhatsApp)}
              className={!canShare ? "opacity-50" : ""}
            >
              <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleShareClick(onView)}
              className={!canShare ? "opacity-50" : ""}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              {t("view")}
            </Button>
            <Button variant="outline" size="sm" onClick={onViewResponses}>
              <Eye className="h-4 w-4 mr-1" />
              {t("responses")}
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleActive}>
              {survey.is_active ? (
                <><PowerOff className="h-4 w-4 mr-1" />{t("deactivate")}</>
              ) : (
                <><Power className="h-4 w-4 mr-1" />{t("activate")}</>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onExtendExpiry}>
              <Clock className="h-4 w-4 mr-1" />
              {t("extendExpiry")}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete} className="col-span-2">
              <Trash2 className="h-4 w-4 mr-1" />
              {t("delete")}
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit} className="col-span-2">
              <Edit className="h-4 w-4 mr-1" />
              {t("edit")}
            </Button>
            <Button variant="default" size="sm" onClick={onFindParticipants} className="col-span-2">
              <Users className="h-4 w-4 mr-1" />
              Find Participants
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
