import { useEffect, useState } from "react";
import apiClient, { API_BASE_URL } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Upload, Loader2, Trash2, Palette } from "lucide-react";
import { toast } from "sonner";

export default function CompanyBranding() {
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#2980B9");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await apiClient.get("/settings");
      if (data) {
        setSettingsId(data.id);
        setCompanyName(data.company_name || "");
        setCompanyAddress(data.company_address || "");
        setLogoUrl(data.logo_url || "");
        setBrandColor(data.brand_color || "#2980B9");
        setTextColor(data.text_color || "#FFFFFF");
      }
    } catch (err) {
      toast.error("Failed to fetch settings");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    try {
      const { data } = await apiClient.post("/settings/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setLogoUrl(data.url);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUrl("");
    toast.success("Logo removed");
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      logo_url: logoUrl,
      brand_color: brandColor,
      text_color: textColor,
    };

    try {
      await apiClient.patch("/settings", payload);
      toast.success("Company branding saved");
    } catch (err: any) {
      toast.error("Failed to save: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const fullLogoUrl = logoUrl ? (logoUrl.startsWith("http") ? logoUrl : `${API_BASE_URL.replace("/api", "")}${logoUrl}`) : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Company Branding</h1>
        <p className="text-muted-foreground mt-1">
          Set your company logo and details — these will appear on payslips
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4" /> Company Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl ? (
              <div className="space-y-3">
                <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-center">
                  <img
                    src={fullLogoUrl}
                    alt="Company Logo"
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Remove Logo
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No logo uploaded yet</p>
              </div>
            )}
            <div>
              <Label htmlFor="logo-upload" className="text-xs">
                Upload Logo (PNG, JPG — max 2MB)
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="mt-1"
              />
              {uploading && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" /> Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Company Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company Address</Label>
              <Textarea
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Enter company address"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Palette className="w-3 h-3" /> Brand Color
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#2980B9"
                  className="w-32 font-mono text-sm"
                  maxLength={7}
                />
                <div
                  className="h-10 flex-1 rounded-md border"
                  style={{ backgroundColor: brandColor }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Palette className="w-3 h-3" /> Text Color
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#FFFFFF"
                  className="w-32 font-mono text-sm"
                  maxLength={7}
                />
                <div
                  className="h-10 flex-1 rounded-md border"
                  style={{ backgroundColor: textColor }}
                />
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !companyName.trim()}
              className="w-full"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Branding
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payslip Header Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ backgroundColor: brandColor, color: textColor }} className="rounded-lg p-6 flex items-center gap-4">
            {logoUrl && (
              <img
                src={fullLogoUrl}
                alt="Logo"
                className="w-14 h-14 object-contain bg-white rounded p-1"
              />
            )}
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold tracking-wide">
                {companyName || "Company Name"}
              </h2>
              {companyAddress && (
                <p className="text-xs mt-1 opacity-80 whitespace-pre-line">
                  {companyAddress}
                </p>
              )}
              <p className="text-sm mt-2 font-medium">PAYSLIP</p>
              <p className="text-xs opacity-70">February 2026 • Confidential</p>
            </div>
            {/* Spacer to center text when logo present */}
            {logoUrl && <div className="w-14" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
