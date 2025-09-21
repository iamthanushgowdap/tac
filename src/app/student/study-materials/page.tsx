"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { StudyMaterial, Branch, Semester } from '@/types';
import { STUDY_MATERIAL_STORAGE_KEY } from '@/types';
import { StudyMaterialItem } from '@/components/study-materials/study-material-item';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, BookOpen, Info, AlertTriangle, Search, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Input } from '@/components/ui/input';


export default function StudentStudyMaterialsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [allMaterials, setAllMaterials] = useState<StudyMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<StudyMaterial[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [studentDetails, setStudentDetails] = useState<{
    branch?: Branch, 
    semester?: Semester, 
    isProfileComplete: boolean
  }>({ isProfileComplete: false });


  const fetchAndFilterMaterials = useCallback(() => {
    if (!user || !studentDetails.branch || !studentDetails.semester) {
        setFilteredMaterials([]);
        return;
    }
    if (typeof window !== 'undefined') {
      const storedMaterials = localStorage.getItem(STUDY_MATERIAL_STORAGE_KEY);
      let materials: StudyMaterial[] = storedMaterials ? JSON.parse(storedMaterials) : [];
      
      materials = materials.filter(m => 
        m.branch === studentDetails.branch && m.semester === studentDetails.semester
      );
      setAllMaterials(materials.sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    }
  }, [user, studentDetails.branch, studentDetails.semester]);

  useEffect(() => {
    if (!authLoading && user) {
      const isProfileCompleteForMaterials = !!(user.branch && user.semester);
      setStudentDetails({
        branch: user.branch,
        semester: user.semester,
        isProfileComplete: isProfileCompleteForMaterials
      });
      
      if (user.role !== 'student' && user.role !== 'pending') {
        router.push('/dashboard');
      } else if (isProfileCompleteForMaterials) {
        fetchAndFilterMaterials();
      }
      setPageLoading(false);
    } else if (!authLoading && !user) {
      router.push('/login');
      setPageLoading(false);
    }
  }, [user, authLoading, router, fetchAndFilterMaterials]);

  useEffect(() => {
    let currentMaterials = [...allMaterials];
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
  }, [allMaterials, searchTerm]);


  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== 'student' && user.role !== 'pending')) {
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

  if (user.role === 'pending' && !user.rejectionReason) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Card className="max-w-md mx-auto shadow-lg border-yellow-400">
                <CardHeader><CardTitle className="text-yellow-600 text-xl sm:text-2xl flex items-center justify-center"><AlertTriangle className="mr-2 h-6 w-6" />Account Pending</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-md sm:text-lg text-muted-foreground">
                        Your account is pending approval. Study materials will be available once your account is approved.
                    </p>
                    <Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!studentDetails.isProfileComplete && user.role === 'student') { 
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Card className="max-w-md mx-auto shadow-lg border-orange-400">
                <CardHeader><CardTitle className="text-orange-600 text-xl sm:text-2xl flex items-center justify-center"><Info className="mr-2 h-6 w-6" />Profile Incomplete</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-md sm:text-lg text-muted-foreground">
                        Your profile information (branch or semester) is incomplete. Please contact administration to update your details. Study materials cannot be displayed.
                    </p>
                    <Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
            <BookOpen className="mr-3 h-7 w-7" /> Study Materials
        </h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-8">
        Access materials for your branch: <strong>{studentDetails.branch}</strong>, semester: <strong>{studentDetails.semester}</strong>.
      </p>
      
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5"/> Search Materials</CardTitle>
          <ShadCnCardDescription>Filter materials by title, description, or uploader.</ShadCnCardDescription>
        </CardHeader>
        <CardContent>
           <Input
            type="search"
            placeholder="Search uploaded materials..."
            className="w-full sm:max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search study materials"
            />
        </CardContent>
      </Card>


      {filteredMaterials.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="py-10 text-center">
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              {searchTerm ? "No materials match your search." : "No study materials uploaded for your branch and semester yet."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Please check back later or contact your faculty.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map(material => (
            <StudyMaterialItem key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  );
}
