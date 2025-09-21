
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Branch, UserProfile, defaultBranches } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, Users, ShieldCheck, BarChart3, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';

const BRANCH_STORAGE_KEY = 'apsconnect_managed_branches'; 

export default function BranchManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<UserProfile[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [isAddBranchDialogOpen, setIsAddBranchDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBranchesAndFaculty = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Fetch branches
      const storedBranches = localStorage.getItem(BRANCH_STORAGE_KEY);
      if (storedBranches) {
        setBranches(JSON.parse(storedBranches));
      } else {
        setBranches(defaultBranches);
        localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(defaultBranches));
      }

      // Fetch faculty
      const profiles: UserProfile[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apsconnect_user_')) { 
          try {
            const profile = JSON.parse(localStorage.getItem(key) || '{}') as UserProfile;
            if (profile.role === 'faculty') {
              profiles.push(profile);
            }
          } catch (error) {
            console.error("Failed to parse user profile from localStorage:", key, error);
          }
        }
      }
      setFacultyProfiles(profiles);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        fetchBranchesAndFaculty();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchBranchesAndFaculty]);

  const handleAddBranch = () => {
    if (!newBranchName.trim()) {
      toast({ title: "Error", description: "Branch name cannot be empty.", variant: "destructive", duration: 3000 });
      return;
    }
    const upperCaseBranchName = newBranchName.trim().toUpperCase();
    if (branches.map(b => b.toUpperCase()).includes(upperCaseBranchName)) {
      toast({ title: "Error", description: `Branch "${upperCaseBranchName}" already exists.`, variant: "destructive", duration: 3000 });
      return;
    }

    const updatedBranches = [...branches, upperCaseBranchName];
    setBranches(updatedBranches);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(updatedBranches));
    }
    toast({ title: "Success", description: `Branch "${upperCaseBranchName}" added successfully.`, duration: 3000 });
    setNewBranchName('');
    setIsAddBranchDialogOpen(false);
  };

  const confirmDeleteBranch = (branchName: Branch) => {
    setBranchToDelete(branchName);
  };

  const handleDeleteBranch = () => {
    if (!branchToDelete) return;

    // Check if branch is used by any faculty
    const isBranchUsed = facultyProfiles.some(faculty => faculty.assignedBranches?.includes(branchToDelete));
    if (isBranchUsed) {
        toast({
            title: "Deletion Prevented",
            description: `Branch "${branchToDelete}" cannot be deleted as it is assigned to one or more faculty members. Please reassign faculty before deleting.`,
            variant: "destructive",
            duration: 7000,
        });
        setBranchToDelete(null);
        return;
    }

    const updatedBranches = branches.filter(b => b !== branchToDelete);
    setBranches(updatedBranches);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(updatedBranches));
    }
    toast({ title: "Success", description: `Branch "${branchToDelete}" deleted successfully.`, duration: 3000 });
    setBranchToDelete(null);
  };

  const getFacultyForBranch = (branchName: Branch): UserProfile[] => {
    return facultyProfiles.filter(faculty => faculty.assignedBranches?.includes(branchName));
  };
  
  const filteredBranches = branches.filter(branch => 
    branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getFacultyForBranch(branch).some(f => 
        f.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.facultyTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
                    <BarChart3 className="mr-3 h-7 w-7" /> Branch Management
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">Define and manage college branches and view associated faculty.</p>
            </div>
        </div>
        <Dialog open={isAddBranchDialogOpen} onOpenChange={setIsAddBranchDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
              <DialogDescription>
                Enter the name for the new branch (e.g., CSE, AI & ML). It will be stored in uppercase.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="branch-name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., MECHANICAL"
                  autoCapitalize="characters"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAddBranch}>Add Branch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Current Branches</CardTitle>
           <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search branches or faculty..."
              className="pl-8 w-full sm:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search branches or faculty"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredBranches.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
                {searchTerm ? "No branches match your search." : "No branches defined. Click 'Add New Branch' to get started."}
            </p>
          ) : (
            <div className="space-y-6">
              {filteredBranches.map(branch => (
                <Card key={branch} className="border-l-4 border-primary/70">
                  <CardHeader className="flex flex-row justify-between items-center pb-3 pt-4 px-4">
                    <CardTitle className="text-lg sm:text-xl">{branch}</CardTitle>
                    <Button variant="destructive" size="sm" onClick={() => confirmDeleteBranch(branch)} aria-label={`Delete branch ${branch}`}>
                      <Trash2 className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Associated Faculty ({getFacultyForBranch(branch).length}):</h4>
                    {getFacultyForBranch(branch).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Name</TableHead>
                            <TableHead className="w-[30%]">Email</TableHead>
                            <TableHead className="w-[30%]">Title/Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFacultyForBranch(branch).map(faculty => (
                            <TableRow key={faculty.uid}>
                              <TableCell>{faculty.displayName || 'N/A'}</TableCell>
                              <TableCell>{faculty.email}</TableCell>
                              <TableCell>{faculty.facultyTitle || <Badge variant="outline">Not Set</Badge>}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-xs text-muted-foreground">No faculty members are currently assigned to this branch.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!branchToDelete} onOpenChange={() => setBranchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the branch "{branchToDelete}"? This action cannot be undone.
              If this branch is assigned to any faculty, deletion will be prevented.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBranchToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBranch} className="bg-destructive hover:bg-destructive/90">
                Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
    

    