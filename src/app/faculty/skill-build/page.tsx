
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { CourseForm } from '@/components/skill-build/course-form';
import type { SkillBuildCourse } from '@/types';
import { SKILL_BUILD_STORAGE_KEY } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription, CardFooter } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ShieldCheck, BrainCircuit, PlusCircle, Edit, Trash2, Globe, Users, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function FacultySkillBuildPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [myCourses, setMyCourses] = useState<SkillBuildCourse[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SkillBuildCourse | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<SkillBuildCourse | null>(null);

  const fetchCourses = useCallback(() => {
    if (!user) return;
    const allCoursesStr = localStorage.getItem(SKILL_BUILD_STORAGE_KEY);
    const allCourses: SkillBuildCourse[] = allCoursesStr ? JSON.parse(allCoursesStr) : [];
    const facultyCourses = allCourses.filter(c => c.facultyId === user.uid);
    setMyCourses(facultyCourses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        fetchCourses();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchCourses]);

  const handleFormSubmitSuccess = (course: SkillBuildCourse) => {
    const allCoursesStr = localStorage.getItem(SKILL_BUILD_STORAGE_KEY);
    let allCourses: SkillBuildCourse[] = allCoursesStr ? JSON.parse(allCoursesStr) : [];
    const existingIndex = allCourses.findIndex(c => c.id === course.id);

    if (existingIndex > -1) {
      allCourses[existingIndex] = course;
    } else {
      allCourses.push(course);
    }
    localStorage.setItem(SKILL_BUILD_STORAGE_KEY, JSON.stringify(allCourses));
    fetchCourses();
    setIsFormOpen(false);
    setEditingCourse(null);
  };

  const openCreateDialog = () => {
    setEditingCourse(null);
    setIsFormOpen(true);
  };
  
  const openEditDialog = (course: SkillBuildCourse) => {
    setEditingCourse(course);
    setIsFormOpen(true);
  };
  
  const confirmDelete = (course: SkillBuildCourse) => {
    setCourseToDelete(course);
  };

  const handleDelete = () => {
    if (!courseToDelete) return;
    const allCoursesStr = localStorage.getItem(SKILL_BUILD_STORAGE_KEY);
    let allCourses: SkillBuildCourse[] = allCoursesStr ? JSON.parse(allCoursesStr) : [];
    const updatedCourses = allCourses.filter(c => c.id !== courseToDelete.id);
    localStorage.setItem(SKILL_BUILD_STORAGE_KEY, JSON.stringify(updatedCourses));
    fetchCourses();
    toast({ title: "Course Deleted", description: `"${courseToDelete.title}" has been deleted.` });
    setCourseToDelete(null);
  };

  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!user || user.role !== 'faculty') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader>
          <CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
          <BrainCircuit className="mr-3 h-7 w-7" /> Skill Build Course Management
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}><PlusCircle className="mr-2 h-4 w-4" /> New Course</Button>
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
        </div>
      </div>
      
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <CardHeader className="border-b"><CardTitle>{editingCourse ? "Edit Course" : "Create New Course"}</CardTitle></CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <CourseForm onSubmitSuccess={handleFormSubmitSuccess} initialData={editingCourse || undefined} facultyUser={user} />
                </CardContent>
                <div className="border-t p-4 flex justify-end sticky bottom-0 bg-background">
                    <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingCourse(null); }}>Cancel</Button>
                </div>
            </Card>
        </div>
      )}

      {myCourses.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <p>You haven't created any courses yet.</p>
            <Button className="mt-4" onClick={openCreateDialog}>Create Your First Course</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCourses.map(course => (
            <Card key={course.id} className="shadow-lg flex flex-col">
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <ShadCnCardDescription>{course.description}</ShadCnCardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                {course.websiteUrl && (
                    <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={course.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{course.websiteUrl}</a>
                    </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{course.enrolledStudentUids.length} student(s) enrolled</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">Created: {format(new Date(course.createdAt), "PP")}</span>
                <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(course)}><Edit className="mr-1 h-3 w-3" />Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => confirmDelete(course)}><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the course "{courseToDelete?.title}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
