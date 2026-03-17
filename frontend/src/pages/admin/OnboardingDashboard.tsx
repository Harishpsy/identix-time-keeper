import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Search,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    Clock,
    UserCheck,
    AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { OnboardingModal } from "@/components/common/OnboardingModal";

export default function OnboardingDashboard() {
    const { role, profile } = useAuth();
    const [onboardings, setOnboardings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationNotes, setVerificationNotes] = useState("");
    const [showOnboardingModal, setShowOnboardingModal] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'onboarded'>('pending');

    const fetchOnboardings = async () => {
        if (role === 'employee') return;
        setLoading(true);
        try {
            const { data } = await apiClient.get("/onboarding/dashboard");
            setOnboardings(data);
        } catch (err) {
            console.error("Failed to fetch onboarding data", err);
            toast.error("Failed to load onboarding dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOnboardings();
    }, [role]);

    useEffect(() => {
        if (!selectedRequest) {
            setDocuments([]);
            return;
        }
        setDocsLoading(true);
        apiClient.get(`/onboarding/documents/${selectedRequest.id}`)
            .then(({ data }) => setDocuments(data))
            .catch(() => setDocuments([]))
            .finally(() => setDocsLoading(false));
    }, [selectedRequest]);

    const handleVerify = async (status: 'Approved' | 'Rejected') => {
        if (!selectedRequest) return;
        setVerifying(true);
        try {
            await apiClient.post("/onboarding/verify", {
                userId: selectedRequest.id,
                status,
                notes: verificationNotes
            });
            toast.success(`Onboarding ${status.toLowerCase()} successfully`);
            setSelectedRequest(null);
            setDocuments([]);
            setVerificationNotes("");
            fetchOnboardings();
        } catch (err) {
            toast.error(`Failed to ${status.toLowerCase()} onboarding`);
        } finally {
            setVerifying(false);
        }
    };

    const filtered = onboardings.filter(o => {
        const matchesSearch =
            o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            o.email?.toLowerCase().includes(search.toLowerCase()) ||
            o.employee_id?.toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === 'onboarded'
            ? o.onboarding_status === 'Active'
            : o.onboarding_status !== 'Active';
        return matchesSearch && matchesTab;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Draft': return <Badge variant="outline">Draft</Badge>;
            case 'Pending Submission': return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Pending</Badge>;
            case 'Under Review': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 animate-pulse">Reviewing</Badge>;
            case 'Approved': return <Badge variant="secondary" className="bg-green-100 text-green-700">Approved</Badge>;
            case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {role === 'employee' ? "Onboarding Status" : "Onboarding Dashboard"}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {role === 'employee' ? "Track your registration progress" : "Track and verify new employee registrations"}
                    </p>
                </div>
                {role !== 'employee' && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                            <UserCheck className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary">{onboardings.length} Active Onboardings</span>
                        </div>
                    </div>
                )}
            </div>

            {role === 'employee' ? (
                <div className="grid gap-6">
                    <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Registration Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <div className="space-y-1">
                                    <p className="font-medium">Current Status</p>
                                    <p className="text-xs text-muted-foreground">Updated {format(new Date(), "dd MMM, yyyy")}</p>
                                </div>
                                {getStatusBadge(profile?.onboarding_status || 'Draft')}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold">What happens next?</h4>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-3">
                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                            profile?.onboarding_status === 'Active' ? "bg-success/20 text-success" : "bg-primary/10 text-primary"
                                        )}>
                                            <CheckCircle className="w-3 h-3" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Submit Documents</p>
                                            <p>Ensure all required IDs and certificates are uploaded.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                            ['Active', 'Under Review'].includes(profile?.onboarding_status) ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Clock className="w-3 h-3" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Admin Verification</p>
                                            <p>Our team will review your application within 2-3 business days.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                            profile?.onboarding_status === 'Active' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                        )}>
                                            <UserCheck className="w-3 h-3" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Account Activation</p>
                                            <p>Once approved, you'll have full access to all system features.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {profile?.onboarding_status !== 'Active' && (
                                <Button
                                    className="w-full h-12 text-base shadow-lg shadow-primary/20"
                                    onClick={() => setShowOnboardingModal(true)}
                                >
                                    {profile?.onboarding_status === 'Draft' ? "Start Onboarding" : "View/Edit Submission"}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <OnboardingModal
                        isOpen={showOnboardingModal}
                        onClose={() => setShowOnboardingModal(false)}
                        user={profile}
                    />
                </div>
            ) : (
                <>
                    {/* Tab Bar */}
                    <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeTab === 'pending'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Pending
                            <span className={cn("ml-2 px-1.5 py-0.5 rounded text-xs", activeTab === 'pending' ? "bg-amber-100 text-amber-700" : "bg-muted-foreground/20")}>
                                {onboardings.filter(o => o.onboarding_status !== 'Active').length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('onboarded')}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeTab === 'onboarded'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Onboarded
                            <span className={cn("ml-2 px-1.5 py-0.5 rounded text-xs", activeTab === 'onboarded' ? "bg-green-100 text-green-700" : "bg-muted-foreground/20")}>
                                {onboardings.filter(o => o.onboarding_status === 'Active').length}
                            </span>
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <Card className="border-border/50">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Employee ID</TableHead>
                                            <TableHead>Started On</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-64 text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/40" />
                                                    <p className="text-sm text-muted-foreground mt-2">Loading data...</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-64 text-center">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                        <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                                                        <p>No onboarding requests found</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filtered.map((item) => (
                                                <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-foreground">{item.full_name}</span>
                                                            <span className="text-xs text-muted-foreground">{item.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{item.department_name || '—'}</TableCell>
                                                    <TableCell className="font-mono text-sm">{item.employee_id || '—'}</TableCell>
                                                    <TableCell className="text-sm">
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {format(new Date(item.created_at), "dd MMM yyyy")}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(item.onboarding_status)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedRequest(item)}
                                                            className="transition-opacity"
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            {activeTab === 'onboarded' ? 'View' : 'Review'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                        <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl">
                            <DialogHeader>
                                <DialogTitle>Review Onboarding Request</DialogTitle>
                            </DialogHeader>
                            {selectedRequest && (
                                <div className="space-y-6 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card className="bg-muted/30">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Info</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-1">
                                                <p><span className="text-muted-foreground">Name:</span> {selectedRequest.full_name}</p>
                                                <p><span className="text-muted-foreground">Email:</span> {selectedRequest.email}</p>
                                                <p><span className="text-muted-foreground">Mobile:</span> {selectedRequest.phone_number || '—'}</p>
                                                <p><span className="text-muted-foreground">Gender:</span> {selectedRequest.gender || '—'}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-muted/30">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employment</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-1">
                                                <p><span className="text-muted-foreground">Department:</span> {selectedRequest.department_name || '—'}</p>
                                                <p><span className="text-muted-foreground">ID:</span> {selectedRequest.employee_id || '—'}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Verification Notes</Label>
                                        <Textarea
                                            placeholder="Add any feedback or reasons for rejection..."
                                            value={verificationNotes}
                                            onChange={(e) => setVerificationNotes(e.target.value)}
                                            className="min-h-[80px] bg-muted/30"
                                        />
                                    </div>

                                    {/* Uploaded Documents */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold">Uploaded Documents</p>
                                        {docsLoading ? (
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Loading documents...
                                            </div>
                                        ) : documents.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic">No documents uploaded yet.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {documents.map((doc) => (
                                                    <a
                                                        key={doc.id}
                                                        href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${doc.file_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors group"
                                                    >
                                                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                                            <Eye className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{doc.document_type}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{doc.file_path.split('/').pop()}</p>
                                                        </div>
                                                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedRequest.onboarding_status !== 'Active' && (
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                variant="destructive"
                                                className="flex-1 gap-2"
                                                disabled={verifying}
                                                onClick={() => handleVerify('Rejected')}
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject &amp; Request Correction
                                            </Button>
                                            <Button
                                                className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground"
                                                disabled={verifying}
                                                onClick={() => handleVerify('Approved')}
                                            >
                                                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                Approve &amp; Activate
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
