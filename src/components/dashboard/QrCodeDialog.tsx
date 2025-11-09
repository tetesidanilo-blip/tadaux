import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";

interface QrCodeDialogProps {
  shareToken: string | null;
  onClose: () => void;
}

export const QrCodeDialog = ({ shareToken, onClose }: QrCodeDialogProps) => {
  const { t } = useLanguage();

  const downloadQRCode = () => {
    if (!shareToken) return;
    
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-code-${shareToken}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const surveyLink = shareToken ? `${window.location.origin}/survey/${shareToken}` : "";

  return (
    <Dialog open={!!shareToken} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("qrCode")}</DialogTitle>
          <DialogDescription>{t("qrCodeDesc")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {shareToken && (
            <>
              <QRCodeSVG 
                id="qr-code-svg"
                value={surveyLink}
                size={256}
                level="H"
                includeMargin
              />
              <p className="text-sm text-muted-foreground text-center break-all">
                {surveyLink}
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button onClick={downloadQRCode}>
            <Download className="h-4 w-4 mr-2" />
            {t("download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
