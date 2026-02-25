import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { CalendarDays, FileText, Upload, Save, FileDown, Loader2 } from "lucide-react";

export default function Holidays() {
    const { role } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [details, setDetails] = useState("");
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchHolidays();
    }, [year]);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/holidays?year=${year}`);
            setDetails(data.details || "");
            setPdfUrl(data.pdf_url || null);
        } catch (err) {
            console.error("Failed to fetch holidays", err);
            toast({ title: "Error", description: "Failed to load holidays", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.post("/holidays", { year, details, pdf_url: pdfUrl });
            toast({ title: "Success", description: "Holidays updated successfully" });
        } catch (err) {
            console.error("Failed to save holidays", err);
            toast({ title: "Error", description: "Failed to save holidays", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            toast({ title: "Invalid file", description: "Please upload a PDF file", variant: "destructive" });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("pdf", file);

        try {
            const { data } = await apiClient.post("/holidays/upload-pdf", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const newPdfUrl = data.pdf_url;
            setPdfUrl(newPdfUrl);

            // Auto-save to the holiday record so the link is persistent immediately
            await apiClient.post("/holidays", { year, details, pdf_url: newPdfUrl });

            toast({ title: "Uploaded & Saved", description: "Holiday PDF uploaded and saved successfully" });
        } catch (err) {
            console.error("Failed to upload PDF", err);
            toast({ title: "Error", description: "Failed to upload PDF", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePdf = async () => {
        try {
            setPdfUrl(null);
            // Auto-save the removal
            await apiClient.post("/holidays", { year, details, pdf_url: null });
            toast({ title: "Removed", description: "Holiday PDF removed and saved" });
        } catch (err) {
            console.error("Failed to remove PDF", err);
            toast({ title: "Error", description: "Failed to update record", variant: "destructive" });
        }
    };

    const isAdmin = role === "admin";
    const hasDetails = details.trim().length > 0;
    const hasPdf = !!pdfUrl;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Holidays List {year}</h1>
                            <p className="text-sm text-muted-foreground">
                                {isAdmin ? "Manage official company holidays" : "View official company holidays"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Label htmlFor="year-select" className="sr-only">Year</Label>
                        <Input
                            id="year-select"
                            type="number"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="w-32 bg-background/50 backdrop-blur-sm border-primary/20"
                        />
                        {isAdmin && (
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </Button>
                        )}
                    </div>
                </div>

                {!isAdmin && !hasDetails && !hasPdf ? (
                    <Card className="border-dashed border-2 border-muted bg-muted/20">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-muted-foreground">No Holidays Published</h3>
                            <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-1">
                                The holiday list for {year} has not been uploaded yet. Please check back later.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Details Card - Only show for non-admins if it has content */}
                        {(isAdmin || hasDetails) && (
                            <Card className={`${hasPdf ? "lg:col-span-2" : "lg:col-span-3"} border-primary/10 bg-card/50 backdrop-blur-xl shadow-xl overflow-hidden`}>
                                <CardHeader className="border-b border-primary/5 bg-primary/5">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Holiday Details
                                    </CardTitle>
                                    <CardDescription>
                                        {isAdmin ? "Edit the holiday descriptions below" : "Review the list of holidays for this year"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {isAdmin ? (
                                        <Textarea
                                            value={details}
                                            onChange={(e) => setDetails(e.target.value)}
                                            placeholder="Enter holiday details here... (e.g., Dates, Names, and descriptions)"
                                            className="min-h-[400px] bg-background/50 border-primary/10 focus:border-primary/30 transition-all resize-none font-mono text-sm"
                                        />
                                    ) : (
                                        <div className="min-h-[200px] p-4 rounded-lg bg-muted/30 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                            {details}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* PDF Card - Only show for non-admins if it exists */}
                        {(isAdmin || hasPdf) && (
                            <Card className={`border-primary/10 bg-card/50 backdrop-blur-xl shadow-xl ${!hasDetails && !isAdmin ? "lg:col-span-3" : ""}`}>
                                <CardHeader className="border-b border-primary/5 bg-primary/5">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary" />
                                        Holiday PDF
                                    </CardTitle>
                                    <CardDescription>
                                        {isAdmin ? "Upload an official PDF document" : "Download the official holiday list"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {pdfUrl ? (
                                        <div className="p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center gap-4 transition-all hover:bg-primary/10 group">
                                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-primary">PDF Available</p>
                                                <p className="text-xs text-muted-foreground mt-1">Official holiday list for {year}</p>
                                            </div>
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="w-full gap-2 border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all"
                                            >
                                                <a
                                                    href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}${pdfUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download={`Holidays_${year}.pdf`}
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                    Download PDF
                                                </a>
                                            </Button>
                                            {isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                                    onClick={handleRemovePdf}
                                                >
                                                    Remove attachment
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-8 rounded-2xl border-2 border-dashed border-muted bg-muted/20 flex flex-col items-center justify-center text-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                <Upload className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-muted-foreground">No PDF attached</p>
                                                {isAdmin && <p className="text-xs text-muted-foreground/60 mt-1">Upload a PDF for employees to download</p>}
                                            </div>
                                        </div>
                                    )}

                                    {isAdmin && (
                                        <div className="space-y-4 pt-4 border-t border-primary/5">
                                            <Label htmlFor="pdf-upload" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {pdfUrl ? "Replace PDF" : "Upload Official List"}
                                            </Label>
                                            <div className="relative group">
                                                <Input
                                                    id="pdf-upload"
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={handlePdfUpload}
                                                    disabled={uploading}
                                                    className="cursor-pointer file:cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-4 file:text-xs file:font-semibold hover:border-primary/50 transition-all font-sans"
                                                />
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-md">
                                                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                * Only PDF files are supported. Max size 5MB.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
