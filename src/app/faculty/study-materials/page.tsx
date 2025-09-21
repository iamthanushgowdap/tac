"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { StudyMaterialForm } from '@/components/study-materials/study-material-form';
import type { StudyMaterial, Branch, Semester } from '@/types';
import { STUDY_MATERIAL_STORAGE_KEY, semesters } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ShieldCheck, BookOpen, PlusCircle, Edit3, Trash2, Download, Search, Info, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';


export default function FacultyStudyMaterialsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allMaterials, setAllMaterials] = useState<StudyMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<StudyMaterial[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterial | null>(null);
  
  const memoizedFacultyAssignedBranches = useMemo(() => user?.assignedBranches || [], [user?.assignedBranches]);
  
  const [filterBranch, setFilterBranch] = useState<string>(memoizedFacultyAssignedBranches.length > 0 ? memoizedFacultyAssignedBranches[0] : 'all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');


  const fetchMaterials = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedMaterials = localStorage.getItem(STUDY_MATERIAL_STORAGE_KEY);
      let materials: StudyMaterial[] = storedMaterials ? JSON.parse(storedMaterials) : [];
      if (memoizedFacultyAssignedBranches.length > 0) {
        materials = materials.filter(m => memoizedFacultyAssignedBranches.includes(m.branch));
      } else {
        materials = []; 
      }
      setAllMaterials(materials.sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    }
  }, [memoizedFacultyAssignedBranches]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push(user ? '/dashboard' : '/login');
      } else {
         if (memoizedFacultyAssignedBranches.length > 0 && filterBranch === 'all') {
            setFilterBranch(memoizedFacultyAssignedBranches[0]);
        }
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, memoizedFacultyAssignedBranches, filterBranch]);

  useEffect(() => {
    if (!pageLoading && user && user.role === 'faculty') {
        fetchMaterials();
    }
  }, [fetchMaterials, pageLoading, user]);
  
  useEffect(() => {
    let currentMaterials = [...allMaterials];
    if (filterBranch !== 'all') {
      currentMaterials = currentMaterials.filter(m => m.branch === filterBranch);
    }
    if (filterSemester !== 'all') {
      currentMaterials = currentMaterials.filter(m => m.semester === filterSemester);
    }
    if (searchTerm) {
      const termLower = searchTerm.toLowerCase();
      currentMaterials = currentMaterials.filter(m => 
        m.title.toLowerCase().includes(termLower) ||
        m.description?.toLowerCase().includes(termLower) ||
        m.uploadedByDisplayName.toLowerCase().includes(termLower) ||
        m.attachments.some(att => att.name.toLowerCase().includes(termLower))
      );
    }
    setFilteredMaterials(currentMaterials);
  }, [allMaterials, filterBranch, filterSemester, searchTerm]);


  const handleFormSubmitSuccess = (material: StudyMaterial) => {
    const existingIndex = allMaterials.findIndex(m => m.id === material.id);
    let updatedFullList;
    if (existingIndex > -1) {
      updatedFullList = [...allMaterials];
      updatedFullList[existingIndex] = material;
    } else {
      updatedFullList = [material, ...allMaterials];
    }
    setAllMaterials(updatedFullList);

    if (typeof window !== 'undefined') {
        const globalMaterialsStr = localStorage.getItem(STUDY_MATERIAL_STORAGE_KEY);
        let globalMaterials: StudyMaterial[] = globalMaterialsStr ? JSON.parse(globalMaterialsStr) : [];
        const globalIndex = globalMaterials.findIndex(m => m.id === material.id);
        if (globalIndex > -1) {
            globalMaterials[globalIndex] = material;
        } else {
            globalMaterials.push(material);
        }
        localStorage.setItem(STUDY_MATERIAL_STORAGE_KEY, JSON.stringify(globalMaterials));
    }
    setIsFormDialogOpen(false);
    setEditingMaterial(null);
  };

  const openEditDialog = (material: StudyMaterial) => {
    if (material.uploadedByUid === user?.uid || memoizedFacultyAssignedBranches.includes(material.branch)) {
        setEditingMaterial(material);
        setIsFormDialogOpen(true);
    } else {
        toast({ title: "Unauthorized", description: "You can only edit materials for your assigned branches or those you uploaded.", variant: "destructive"});
    }
  };

  const openCreateDialog = () => {
    setEditingMaterial(null);
    setIsFormDialogOpen(true);
  };

  const confirmDeleteMaterial = (material: StudyMaterial) => {
     if (material.uploadedByUid === user?.uid || memoizedFacultyAssignedBranches.includes(material.branch)) {
        setMaterialToDelete(material);
    } else {
        toast({ title: "Unauthorized", description: "You can only delete materials for your assigned branches or those you uploaded.", variant: "destructive"});
    }
  };

  const handleDeleteMaterial = () => {
    if (!materialToDelete) return;
    const updatedMaterials = allMaterials.filter(m => m.id !== materialToDelete.id);
    setAllMaterials(updatedMaterials);
    
    if (typeof window !== 'undefined') {
        const globalMaterialsStr = localStorage.getItem(STUDY_MATERIAL_STORAGE_KEY);
        let globalMaterials: StudyMaterial[] = globalMaterialsStr ? JSON.parse(globalMaterialsStr) : [];
        globalMaterials = globalMaterials.filter(m => m.id !== materialToDelete.id);
        localStorage.setItem(STUDY_MATERIAL_STORAGE_KEY, JSON.stringify(globalMaterials));
    }

    toast({ title: "Success", description: `Material "${materialToDelete.title}" deleted.`, duration: 3000 });
    setMaterialToDelete(null);
  };
  
  const handleDownloadAttachment = (attachment: StudyMaterial['attachments'][0]) => {
    toast({ title: "Download Started (Mock)", description: `Downloading ${attachment.name}... This is a mock.`, duration: 3000 });
    const blob = new Blob(["Mock file content for " + attachment.name], { type: attachment.type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'faculty') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader><CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle></CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (memoizedFacultyAssignedBranches.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary text-xl sm:text-2xl flex items-center">
              <Info className="mr-2 h-6 w-6" /> No Assigned Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-md text-muted-foreground">
              You are not currently assigned to any branches. Please contact an administrator to get assigned to manage study materials.
            </p>
            <Link href="/faculty"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
            <BookOpen className="mr-3 h-7 w-7" /> Study Material Management
        </h1>
        <div className="flex items-center gap-2">
            <Button onClick={openCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Upload New Material
            </Button>
             <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
            </Button>
        </div>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-8">Upload, view, and manage study materials for your assigned branches.</p>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Filter &amp; Search Materials</CardTitle>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger><SelectValue placeholder="Filter by Branch" /></SelectTrigger>
              <SelectContent>
                {memoizedFacultyAssignedBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger><SelectValue placeholder="Filter by Semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search materials..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search study materials"
                />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Uploaded Study Materials</CardTitle>
          <ShadCnCardDescription>
            Total materials matching filters: {filteredMaterials.length}
          </ShadCnCardDescription>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
                {searchTerm || filterBranch !== memoizedFacultyAssignedBranches[0] || filterSemester !== 'all' 
                ? "No materials match your current filters." 
                : "No study materials uploaded for your assigned branches yet. Click 'Upload New Material' to start."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map(material => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.title}</TableCell>
                      <TableCell><Badge variant="outline">{material.branch}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{material.semester}</Badge></TableCell>
                       <TableCell>
                        {material.attachments.map((att, idx) => (
                          <div key={idx} className="text-xs truncate max-w-[150px]" title={att.name}>
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleDownloadAttachment(att)} aria-label={`Download attachment ${att.name}`}>
                                <Download className="mr-1 h-3 w-3"/> {att.name}
                            </Button>
                             ({(att.size / (1024 * 1024)).toFixed(2)} MB)
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>{material.uploadedByDisplayName}</TableCell>
                      <TableCell>{format(new Date(material.uploadedAt), "PPp")}</TableCell>
                      <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(material)} disabled={material.uploadedByUid !== user?.uid && !memoizedFacultyAssignedBranches.includes(material.branch)} aria-label={`Edit material ${material.title}`}>
                              <Edit3 className="h-3 w-3 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => confirmDeleteMaterial(material)} disabled={material.uploadedByUid !== user?.uid && !memoizedFacultyAssignedBranches.includes(material.branch)} aria-label={`Delete material ${material.title}`}>
                              <Trash2 className="h-3 w-3 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isFormDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <CardHeader className="border-b">
                    <CardTitle>{editingMaterial ? "Edit Study Material" : "Upload New Study Material"}</CardTitle>
                    <ShadCnCardDescription>{editingMaterial ? "Update the details of this material." : "Provide details and upload files for the new study material."}</ShadCnCardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <StudyMaterialForm
                        onSubmitSuccess={handleFormSubmitSuccess}
                        initialData={editingMaterial || undefined}
                        availableBranches={managedBranches}
                        isLoading={formSubmitting}
                        setIsLoading={setFormSubmitting}
                    />
                </CardContent>
                <div className="border-t p-4 flex justify-end sticky bottom-0 bg-background">
                    <Button variant="outline" onClick={() => {setIsFormDialogOpen(false); setEditingMaterial(null);}} disabled={formSubmitting}>
                        Cancel
                    </Button>
                </div>
            </Card>
          </div>
      )}

      <AlertDialog open={!!materialToDelete} onOpenChange={() => setMaterialToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the material "{materialToDelete?.title}"? 
              This action cannot be undone and all associated files will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMaterialToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaterial} className="bg-destructive hover:bg-destructive/90">
                Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
