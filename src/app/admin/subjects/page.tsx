"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, Edit3, ShieldCheck, Sparkles, ArrowLeft, Search, Users, BookCopy } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import type { Branch, Semester, Subject, UserProfile } from '@/types';
import { defaultBranches, semesters, SUBJECT_STORAGE_KEY } from '@/types';

const BRANCH_STORAGE_KEY = 'apsconnect_managed_branches';

const subjectFormSchema = z.object({
  name: z.string().min(3, "Subject name must be at least 3 characters.").max(100),
  code: z.string().min(1, "Subject code is required.").max(20),
  branch: z.string({ required_error: "Branch is required." }),
  semester: z.string({ required_error: "Semester is required." }) as z.ZodSchema<Semester>,
  assignedFacultyUids: z.array(z.string()).optional(),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

export default function SubjectManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<UserProfile[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [managedBranches, setManagedBranches] = useState<Branch[]>(defaultBranches);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: "",
      code: "",
      branch: undefined,
      semester: undefined,
      assignedFacultyUids: [],
    },
  });

  const fetchSubjects = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedSubjects = localStorage.getItem(SUBJECT_STORAGE_KEY);
      setSubjects(storedSubjects ? JSON.parse(storedSubjects) : []);
    }
  }, []);
  
  const fetchFaculty = useCallback(() => {
    if (typeof window !== 'undefined') {
      const profiles: UserProfile[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('apsconnect_user_')) {
          try {
            const profile = JSON.parse(localStorage.getItem(key)!);
            if (profile.role === 'faculty') {
              profiles.push(profile);
            }
          } catch (e) { /* ignore */ }
        }
      }
      setFacultyProfiles(profiles);
    }
  }, []);
  
  const fetchManagedBranches = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(BRANCH_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setManagedBranches(parsed);
          }
        } catch(e) {/* ignore */}
      }
    }
  }, []);


  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        fetchSubjects();
        fetchFaculty();
        fetchManagedBranches();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchSubjects, fetchFaculty, fetchManagedBranches]);
  
  const handleFormSubmit = (data: SubjectFormValues) => {
    const subjectId = `${data.branch}_${data.semester}_${data.code.toUpperCase()}`;
    const allStoredSubjects = subjects;

    if (!editingSubject && allStoredSubjects.some(s => s.id === subjectId)) {
        toast({ title: "Error", description: "A subject with this code already exists for the selected branch and semester.", variant: "destructive" });
        return;
    }
    
    const newSubject: Subject = {
        id: editingSubject?.id || subjectId,
        name: data.name,
        code: data.code.toUpperCase(),
        branch: data.branch,
        semester: data.semester as Semester,
        assignedFacultyUids: data.assignedFacultyUids || [],
    };
    
    let updatedSubjects: Subject[];
    if (editingSubject) {
        updatedSubjects = allStoredSubjects.map(s => s.id === editingSubject.id ? newSubject : s);
    } else {
        updatedSubjects = [...allStoredSubjects, newSubject];
    }
    
    localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(updatedSubjects));
    setSubjects(updatedSubjects);
    toast({ title: "Success", description: `Subject "${data.name}" has been ${editingSubject ? 'updated' : 'created'}.` });
    
    setIsFormOpen(false);
    setEditingSubject(null);
    form.reset();
  };
  
  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    form.reset({
        name: subject.name,
        code: subject.code,
        branch: subject.branch,
        semester: subject.semester,
        assignedFacultyUids: subject.assignedFacultyUids,
    });
    setIsFormOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSubject(null);
    form.reset({
      name: "", code: "", branch: undefined, semester: undefined, assignedFacultyUids: []
    });
    setIsFormOpen(true);
  };
  
  const handleDeleteSubject = () => {
    if (!subjectToDelete) return;
    const updatedSubjects = subjects.filter(s => s.id !== subjectToDelete.id);
    setSubjects(updatedSubjects);
    localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(updatedSubjects));
    toast({ title: "Success", description: `Subject "${subjectToDelete.name}" deleted.` });
    setSubjectToDelete(null);
  };

  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.semester.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.assignedFacultyUids.some(uid => facultyProfiles.find(f => f.uid === uid)?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const groupedSubjectsByBranch = filteredSubjects.reduce((acc, subject) => {
    const { branch } = subject;
    if (!acc[branch]) {
      acc[branch] = {};
    }
    const { semester } = subject;
    if (!acc[branch][semester]) {
      acc[branch][semester] = [];
    }
    acc[branch][semester].push(subject);
    return acc;
  }, {} as Record<Branch, Record<Semester, Subject[]>>);


  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><Sparkles className="mr-3 h-7 w-7" /> Subject Management</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Create subjects and assign faculty for each branch and semester.</p>
            </div>
        </div>
        <Button onClick={openCreateDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add New Subject</Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Subject List</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search subjects, codes, or faculty..."
              className="pl-8 w-full sm:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search subjects"
            />
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedSubjectsByBranch).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{searchTerm ? "No subjects match your search." : "No subjects created yet."}</p>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2">
              {Object.entries(groupedSubjectsByBranch).map(([branch, semestersData]) => (
                <AccordionItem key={branch} value={branch} className="border rounded-lg px-4 bg-muted/20">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className='flex items-center gap-2'>
                      <BookCopy className="h-5 w-5 text-primary" />
                      {branch}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-2">
                    <div className="space-y-1">
                      <Accordion type="multiple" className="w-full space-y-1">
                        {Object.entries(semestersData).map(([semester, subjectsList]) => (
                          <AccordionItem key={semester} value={semester} className="border-l-2 border-primary/50 pl-4">
                             <AccordionTrigger className="text-md font-medium hover:no-underline py-2">
                              {semester}
                            </AccordionTrigger>
                             <AccordionContent className="pt-2 pl-2">
                               <div className="space-y-3">
                                {subjectsList.map(subject => (
                                  <div key={subject.id} className="flex justify-between items-start p-3 border rounded-md bg-background">
                                    <div>
                                      <p className="font-semibold">{subject.name} <span className="font-normal text-muted-foreground">({subject.code})</span></p>
                                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <Users className="h-3 w-3 mr-1.5" />
                                        {subject.assignedFacultyUids.length > 0 ? 
                                          subject.assignedFacultyUids.map(uid => facultyProfiles.find(f => f.uid === uid)?.displayName || 'Unknown').join(', ') :
                                          'No faculty assigned'
                                        }
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button variant="outline" size="sm" onClick={() => openEditDialog(subject)}><Edit3 className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Edit</span></Button>
                                      <Button variant="destructive" size="sm" onClick={() => setSubjectToDelete(subject)}><Trash2 className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Delete</span></Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                             </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingSubject ? "Edit Subject" : "Add New Subject"}</DialogTitle>
            <DialogDescription>Fill in the details for the subject.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="branch" render={({ field }) => (<FormItem><FormLabel>Branch</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger></FormControl><SelectContent>{managedBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="semester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger></FormControl><SelectContent>{semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Subject Name</FormLabel><FormControl><Input placeholder="e.g., Data Structures" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Subject Code</FormLabel><FormControl><Input placeholder="e.g., 18CS32" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="assignedFacultyUids"
                render={() => (
                  <FormItem>
                    <FormLabel>Assign Faculty</FormLabel>
                    <div className="p-2 border rounded-md max-h-40 overflow-y-auto space-y-2">
                      {facultyProfiles.map((faculty) => (
                        <FormField
                          key={faculty.uid}
                          control={form.control}
                          name="assignedFacultyUids"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value?.includes(faculty.uid)} onCheckedChange={(checked) => {
                                return checked ? field.onChange([...(field.value || []), faculty.uid]) : field.onChange((field.value || []).filter(uid => uid !== faculty.uid));
                            }} /></FormControl><FormLabel className="font-normal text-sm">{faculty.displayName} ({faculty.email})</FormLabel></FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <SimpleRotatingSpinner className="mr-2" />} {editingSubject ? 'Update Subject' : 'Create Subject'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!subjectToDelete} onOpenChange={() => setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete the subject "{subjectToDelete?.name}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
