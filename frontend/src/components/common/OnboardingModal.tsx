import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    User,
    Briefcase,
    FileText,
    CheckCircle,
    Upload,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Eye,
    X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/apiClient";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

const STEPS = [
    { id: 'personal', title: 'Personal Details', icon: User },
    { id: 'employment', title: 'Employment Info', icon: Briefcase },
    { id: 'documents', title: 'Documents', icon: FileText },
    { id: 'review', title: 'Review & Submit', icon: CheckCircle },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, user }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        phone: user?.phone || '',
        date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
        gender: user?.gender || '',
        address: user?.address || '',
    });
    const [documents, setDocuments] = useState<any[]>([]);

    const progress = ((currentStep + 1) / STEPS.length) * 100;

    // Re-populate form from user profile when modal opens or user changes
    React.useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setFormData({
                phone: user?.phone || '',
                date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
                gender: user?.gender || '',
                address: user?.address || '',
            });
        }
    }, [isOpen, user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('document', file);
        uploadData.append('document_type', type);

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/onboarding/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: uploadData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            setDocuments(prev => [...prev.filter(d => d.type !== type), { type, name: file.name, path: result.filePath }]);
            toast.success(`${type} uploaded successfully`);
        } catch (error) {
            toast.error("Failed to upload document");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        // Validation
        const phoneRegex = /^\d{10}$/;
        if (!formData.phone || !phoneRegex.test(formData.phone)) {
            toast.error("Please enter a valid 10-digit phone number");
            setCurrentStep(0); // Go to personal step
            return;
        }
        if (!formData.date_of_birth) {
            toast.error("Date of Birth is required");
            setCurrentStep(0);
            return;
        }
        if (!formData.gender) {
            toast.error("Gender is required");
            setCurrentStep(0);
            return;
        }

        try {
            setSubmitting(true);

            // 1. Update Profile
            const profileRes = await fetch(`${API_BASE_URL}/onboarding/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!profileRes.ok) throw new Error('Failed to update profile');

            // 2. Submit Onboarding
            const submitRes = await fetch(`${API_BASE_URL}/onboarding/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!submitRes.ok) throw new Error('Failed to submit onboarding');

            toast.success("Onboarding submitted successfully! Awaiting admin review.");
            onClose();
        } catch (error) {
            toast.error("Failed to submit onboarding");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-white/20 shadow-2xl">
                <div className="flex h-[600px]">
                    {/* Sidebar */}
                    <div className="w-1/3 bg-primary/5 p-8 border-r border-border/50 hidden md:block">
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-primary">Onboarding</h2>
                                <p className="text-sm text-muted-foreground mt-1">Complete your profile to get started.</p>
                            </div>

                            <div className="space-y-4">
                                {STEPS.map((step, index) => {
                                    const Icon = step.icon;
                                    const isActive = index === currentStep;
                                    const isCompleted = index < currentStep;

                                    return (
                                        <div key={step.id} className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                isActive ? "bg-primary text-primary-foreground scale-110 shadow-lg" :
                                                    isCompleted ? "bg-success text-success-foreground" :
                                                        "bg-muted text-muted-foreground"
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "text-sm font-medium",
                                                    isActive ? "text-primary" : isCompleted ? "text-success" : "text-muted-foreground"
                                                )}>{step.title}</p>
                                                {isActive && <div className="h-0.5 w-full bg-primary mt-1 animate-in slide-in-from-left duration-300" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-8">
                                <p className="text-xs text-muted-foreground mb-2">Step Progress</p>
                                <Progress value={progress} className="h-1" />
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col p-8">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-xl">{STEPS[currentStep].title}</DialogTitle>
                            <DialogDescription>
                                Please provide the required information for this step.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {currentStep === 0 && (
                                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone" className="flex gap-1">Phone Number <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            placeholder="10-digit mobile number"
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                setFormData(prev => ({ ...prev, phone: val }));
                                            }}
                                            maxLength={10}
                                            className="bg-muted/50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="date_of_birth" className="flex gap-1">Date of Birth <span className="text-destructive">*</span></Label>
                                            <Input
                                                id="date_of_birth"
                                                name="date_of_birth"
                                                type="date"
                                                value={formData.date_of_birth}
                                                onChange={handleInputChange}
                                                className="bg-muted/50"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="gender" className="flex gap-1">Gender <span className="text-destructive">*</span></Label>
                                            <Select onValueChange={(v) => handleSelectChange('gender', v)} value={formData.gender}>
                                                <SelectTrigger className="bg-muted/50">
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="address">Residential Address</Label>
                                        <Textarea
                                            id="address"
                                            name="address"
                                            placeholder="Enter your full address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            className="bg-muted/50 min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <Card className="bg-primary/5 border-primary/20">
                                        <CardContent className="pt-6 space-y-4">
                                            <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                                <span className="text-sm font-medium text-muted-foreground">Department</span>
                                                <span className="font-semibold">{user?.department_name || 'Not Assigned'}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                                <span className="text-sm font-medium text-muted-foreground">Designation</span>
                                                <span className="font-semibold">{user?.designation || 'Trainee'}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                                <span className="text-sm font-medium text-muted-foreground">Joining Date</span>
                                                <span className="font-semibold">{user?.date_of_joining ? new Date(user.date_of_joining).toLocaleDateString() : 'TBD'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-muted-foreground">Reporting Manager</span>
                                                <span className="font-semibold">{user?.manager_name || 'Admin'}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <p className="text-xs text-center text-muted-foreground italic">
                                        * Employment details are pre-filled by HR. Contact your admin if any details are incorrect.
                                    </p>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {[
                                        'Government ID Proof',
                                        'Education Certificate',
                                        'Experience Letter',
                                        'Bank Details Proof'
                                    ].map((docType) => {
                                        const uploaded = documents.find(d => d.type === docType);
                                        return (
                                            <div key={docType} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 group hover:border-primary/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-md",
                                                        uploaded ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{docType}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {uploaded ? uploaded.name : 'PDF, JPG or PNG (Max 5MB)'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {uploaded ? (
                                                        <CheckCircle className="w-5 h-5 text-success" />
                                                    ) : (
                                                        <Label className="cursor-pointer">
                                                            <div className="flex items-center gap-1 text-sm text-primary hover:underline">
                                                                <Upload className="w-4 h-4" />
                                                                <span>Upload</span>
                                                            </div>
                                                            <Input
                                                                type="file"
                                                                className="hidden"
                                                                onChange={(e) => handleFileUpload(e, docType)}
                                                                accept=".pdf,.jpg,.jpeg,.png"
                                                            />
                                                        </Label>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-8">
                                    <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold">Ready to Submit?</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto">
                                        Please review all your details. Once submitted, your profile will be sent for administrative review.
                                    </p>
                                    <div className="flex flex-col gap-2 mt-8 max-w-xs mx-auto text-left">
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-success" />
                                            <span>Personal details completed</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-success" />
                                            <span>Employment verified</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle className={cn("w-4 h-4", documents.length >= 3 ? "text-success" : "text-warning")} />
                                            <span>{documents.length} documents uploaded</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-8 flex items-center justify-between border-t pt-6">
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 0 || submitting}
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Previous
                            </Button>

                            {currentStep === STEPS.length - 1 ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || documents.length < 1}
                                    className="gap-2 px-8"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Submit Profile
                                </Button>
                            ) : (
                                <Button
                                    onClick={nextStep}
                                    className="gap-2 px-8"
                                >
                                    Next Step
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
