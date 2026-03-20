import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Plus, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Loan {
    id: string;
    user_id: string;
    employee_name?: string;
    amount: number;
    interest_rate: number;
    term_months: number;
    monthly_installment: number;
    total_repayable: number;
    status: "pending" | "approved" | "rejected" | "completed";
    purpose: string;
    repayment_start_date?: string;
    created_at: string;
    updated_at: string;
}

const Loans = () => {
    const { role, profile } = useAuth();
    const { toast } = useToast();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isEligibleModalOpen, setIsEligibleModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    // Form states
    const [amount, setAmount] = useState("");
    const [termMonths, setTermMonths] = useState("");
    const [purpose, setPurpose] = useState("");
    const [targetUserId, setTargetUserId] = useState("");
    const [adminInterest, setAdminInterest] = useState("0");
    const [adminStartDate, setAdminStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

    const fetchLoans = async () => {
        try {
            const { data } = await apiClient.get(API.LOANS.LIST);
            setLoans(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching loans:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfiles = async () => {
        try {
            const { data } = await apiClient.get(API.PROFILES.LIST);
            setProfiles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };

    useEffect(() => {
        fetchLoans();
        if (role === 'admin' || role === 'super_admin') {
            fetchProfiles();
        }
    }, [role]);

    const handleRequestLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body: any = {
                amount: parseFloat(amount),
                term_months: parseInt(termMonths),
                purpose,
            };

            if (role === 'admin' || role === 'super_admin' && targetUserId) {
                body.targetUserId = targetUserId;
            }

            const response = await apiClient.post(API.LOANS.CREATE, body);
            if (response.status === 200 || response.status === 201) {
                toast({ title: "Success", description: role === 'admin' || role === 'super_admin' ? "Loan added" : "Loan request submitted" });
                setIsRequestModalOpen(false);
                fetchLoans();
                setAmount("");
                setTermMonths("");
                setPurpose("");
                setTargetUserId("");
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
        }
    };

    const handleUpdateStatus = async (loanId: string, status: string) => {
        try {
            const body: any = { status };
            if (status === "approved") {
                body.interest_rate = parseFloat(adminInterest);
                body.repayment_start_date = adminStartDate;
            }

            const response = await apiClient.patch(API.LOANS.STATUS_BY_ID(loanId), body);
            if (response.status === 200) {
                toast({ title: "Success", description: `Loan ${status}` });
                setIsApproveModalOpen(false);
                fetchLoans();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case "approved": return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
            case "rejected": return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
            case "completed": return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
                    <p className="text-muted-foreground">Manage and track employee loans</p>
                </div>
                <Button
                    className="flex items-center gap-2"
                    onClick={() => {
                        if (role !== 'admin' && role !== 'super_admin' && profile?.date_of_joining) {
                            // Check eligibility (1 year)
                            const joiningDate = new Date(profile.date_of_joining);
                            const oneYearAgo = new Date();
                            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

                            if (joiningDate > oneYearAgo) {
                                setIsEligibleModalOpen(true);
                                return;
                            }
                        }
                        setIsRequestModalOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4" /> {role === 'admin' || role === 'super_admin' ? 'Add Loan' : 'Request Loan'}
                </Button>

                <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{role === 'admin' || role === 'super_admin' ? 'Add Loan for Employee' : 'Loan Request'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleRequestLoan} className="space-y-4">
                            {role === 'admin' || role === 'super_admin' && (
                                <div className="space-y-2">
                                    <Label htmlFor="employee">Select Employee</Label>
                                    <select
                                        id="employee"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={targetUserId}
                                        onChange={(e) => setTargetUserId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select an employee</option>
                                        {profiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="amount">Loan Amount</Label>
                                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="terms">Term (Months)</Label>
                                <Input id="terms" type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="purpose">Purpose</Label>
                                <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
                            </div>
                            <DialogFooter>
                                <Button type="submit">
                                    {role === 'admin' || role === 'super_admin' ? 'Add Loan' : 'Submit Request'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue={role === 'admin' || role === 'super_admin' ? "requests" : "my"}>
                <TabsList>
                    {role !== 'admin' && role !== 'super_admin' && <TabsTrigger value="my">My Loans</TabsTrigger>}
                    {role === 'admin' || role === 'super_admin' && (
                        <>
                            <TabsTrigger value="requests">Loan Requests</TabsTrigger>
                            <TabsTrigger value="completed">Loan Completed</TabsTrigger>
                        </>
                    )}
                </TabsList>

                {role !== 'admin' && role !== 'super_admin' && (
                    <TabsContent value="my">
                        <Card>
                            <CardHeader>
                                <CardTitle>My Loan History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Terms</TableHead>
                                            <TableHead>EMI</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loans.map((loan) => (
                                            <TableRow key={loan.id}>
                                                <TableCell>{format(new Date(loan.created_at), "dd MMM yyyy")}</TableCell>
                                                <TableCell>₹{loan.amount}</TableCell>
                                                <TableCell>{loan.term_months} Months</TableCell>
                                                <TableCell>₹{parseFloat(loan.monthly_installment.toString()).toFixed(2)}</TableCell>
                                                <TableCell>{getStatusBadge(loan.status)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {loans.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No loans found</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {role === 'admin' || role === 'super_admin' && (
                    <>
                        <TabsContent value="requests">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Active & Pending Loan Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Purpose</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loans.filter(l => l.status !== 'completed').map((loan) => (
                                                <TableRow key={loan.id}>
                                                    <TableCell className="font-medium">{loan.employee_name}</TableCell>
                                                    <TableCell>₹{loan.amount}</TableCell>
                                                    <TableCell>{loan.purpose}</TableCell>
                                                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {loan.status === 'pending' && (
                                                            <div className="flex justify-end gap-2">
                                                                <Button size="sm" variant="outline" onClick={() => {
                                                                    setSelectedLoan(loan);
                                                                    setIsApproveModalOpen(true);
                                                                }} className="text-green-600 border-green-200 hover:bg-green-50">
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(loan.id, 'rejected')} className="text-red-600 border-red-200 hover:bg-red-50">
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="completed">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Completed Loans</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Total Paid</TableHead>
                                                <TableHead>Completion Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loans.filter(l => l.status === 'completed').map((loan) => (
                                                <TableRow key={loan.id}>
                                                    <TableCell className="font-medium">{loan.employee_name}</TableCell>
                                                    <TableCell>₹{loan.amount}</TableCell>
                                                    <TableCell>₹{loan.total_repayable}</TableCell>
                                                    <TableCell>{loan.updated_at ? format(new Date(loan.updated_at), "dd MMM yyyy") : 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                            {loans.filter(l => l.status === 'completed').length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No completed loans found</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </>
                )}
            </Tabs>

            {/* Approval Modal */}
            <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Loan Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Interest Rate (%)</Label>
                            <Input type="number" value={adminInterest} onChange={(e) => setAdminInterest(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Repayment Start Date</Label>
                            <Input type="date" value={adminStartDate} onChange={(e) => setAdminStartDate(e.target.value)} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Employee: {selectedLoan?.employee_name}<br />
                            Amount: ₹{selectedLoan?.amount}<br />
                            Terms: {selectedLoan?.term_months} Months
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => selectedLoan && handleUpdateStatus(selectedLoan.id, 'approved')}>Confirm Approval</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Eligibility Modal */}
            <Dialog open={isEligibleModalOpen} onOpenChange={setIsEligibleModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Landmark className="w-5 h-5" />
                            Loan Eligibility
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                            <p className="font-semibold text-lg">Not Yet Eligible</p>
                            <p className="text-muted-foreground">
                                You need at least <span className="font-bold text-foreground">1 year of service</span> to apply for a loan.
                            </p>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                Please contact <span className="font-semibold">Hr or Admin</span> for more information or if you have an emergency.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsEligibleModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Loans;
