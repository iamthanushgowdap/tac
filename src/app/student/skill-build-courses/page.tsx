
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { SkillBuildCourse } from '@/types';
import { SKILL_BUILD_STORAGE_KEY } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, BrainCircuit, Info, AlertTriangle, ArrowLeft, Globe, CheckCircle, PlusCircle } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/components/content/post-item-utils';


export default function StudentSkillBuildCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [allCourses, setAllCourses] = useState<SkillBuildCourse[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchCourses = useCallback(() => {
    const allCoursesStr = localStorage.getItem(SKILL_BUILD_STORAGE_KEY);
    const courses: SkillBuildCourse[] = allCoursesStr ? JSON.parse(allCoursesStr) : [];
    setAllCourses(courses.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'student' && user.role !== 'pending')) {
        router.push(user ? '/dashboard' : '/login');
      } else if (user.role === 'pending' && user.rejectionReason) {
        router.push('/student');
      } else {
        fetchCourses();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchCourses]);

  const handleEnrollment = (courseId: string) => {
    if (!user) return;
    
    const allCoursesStr = localStorage.getItem(SKILL_BUILD_STORAGE_KEY);
    let allCourses: SkillBuildCourse[] = allCoursesStr ? JSON.parse(allCoursesStr) : [];
    const courseIndex = allCourses.findIndex(c => c.id === courseId);

    if (courseIndex === -1) return;

    const course = allCourses[courseIndex];
    const isEnrolled = course.enrolledStudentUids.includes(user.uid);
    
    if (isEnrolled) {
      course.enrolledStudentUids = course.enrolledStudentUids.filter(uid => uid !== user.uid);
      toast({ title: "Unenrolled", description: `You have been unenrolled from "${course.title}".` });
    } else {
      course.enrolledStudentUids.push(user.uid);
      toast({ title: "Enrolled!", description: `You have successfully enrolled in "${course.title}".` });
    }
    
    allCourses[courseIndex] = course;
    localStorage.setItem(SKILL_BUILD_STORAGE_KEY, JSON.stringify(allCourses));
    setAllCourses([...allCourses]);
  };

  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!user || (user.role !== 'student' && user.role !== 'pending') || (user.role === 'pending' && user.rejectionReason)) {
     return <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card></div>;
  }
  
  if (user.role === 'pending' && !user.rejectionReason) {
    return <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg border-yellow-400"><CardHeader><CardTitle className="text-yellow-600 flex items-center justify-center"><AlertTriangle className="mr-2 h-6 w-6" />Account Pending</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Your account is pending approval. Courses will be available once approved.</p><Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link></CardContent></Card></div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
          <BrainCircuit className="mr-3 h-7 w-7" /> Skill Build Courses
        </h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>

      {allCourses.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Info className="mx-auto h-12 w-12 mb-4" />
            <p>No skill build courses have been uploaded by faculty yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allCourses.map(course => {
            const isEnrolled = user ? course.enrolledStudentUids.includes(user.uid) : false;
            return (
              <Card key={course.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(course.facultyName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                            <CardDescription className="text-xs">By {course.facultyName}</CardDescription>
                        </div>
                    </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 h-[60px]">{course.description}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  {course.websiteUrl && (
                    <a href={course.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5">
                      <Globe className="h-4 w-4"/> Visit Course Website
                    </a>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button className="w-full" variant={isEnrolled ? "outline" : "default"} onClick={() => handleEnrollment(course.id)}>
                    {isEnrolled ? <><CheckCircle className="mr-2 h-4 w-4" />Enrolled</> : <><PlusCircle className="mr-2 h-4 w-4" />Enroll Now</>}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
