
"use client";

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { SkillBuildCourse, UserProfile } from '@/types';
import { useAuth, User } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const courseFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000),
  websiteUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  assignedStudentUids: z.array(z.string()).optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

interface CourseFormProps {
  onSubmitSuccess: (newCourse: SkillBuildCourse) => void;
  initialData?: SkillBuildCourse;
  facultyUser: User;
}

export function CourseForm({ onSubmitSuccess, initialData, facultyUser }: CourseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [availableStudents, setAvailableStudents] = React.useState<UserProfile[]>([]);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      websiteUrl: initialData?.websiteUrl || "",
      assignedStudentUids: initialData?.enrolledStudentUids || [],
    },
  });

  React.useEffect(() => {
    // Fetch students from faculty's assigned branches
    const students: UserProfile[] = [];
    if (typeof window !== 'undefined' && facultyUser.assignedBranches) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('apsconnect_user_')) {
          const profile = JSON.parse(localStorage.getItem(key)!) as UserProfile;
          if (profile.role === 'student' && profile.isApproved && profile.branch && facultyUser.assignedBranches.includes(profile.branch)) {
            students.push(profile);
          }
        }
      }
    }
    setAvailableStudents(students.sort((a,b) => (a.displayName || "").localeCompare(b.displayName || "")));
  }, [facultyUser]);

  const onSubmit = async (data: CourseFormValues) => {
    setIsLoading(true);
    const newCourse: SkillBuildCourse = {
      id: initialData?.id || crypto.randomUUID(),
      title: data.title,
      description: data.description,
      websiteUrl: data.websiteUrl,
      facultyId: facultyUser.uid,
      facultyName: facultyUser.displayName || facultyUser.email || 'Faculty',
      createdAt: initialData?.createdAt || new Date().toISOString(),
      enrolledStudentUids: data.assignedStudentUids || [],
    };

    await new Promise(resolve => setTimeout(resolve, 500));
    onSubmitSuccess(newCourse);
    toast({ title: initialData ? "Course Updated" : "Course Created", description: `"${newCourse.title}" has been processed.` });
    setIsLoading(false);
    form.reset({ title: "", description: "", websiteUrl: "", assignedStudentUids: [] });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Course Title</FormLabel><FormControl><Input placeholder="e.g., Advanced React Patterns" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="What will students learn in this course?" {...field} disabled={isLoading} rows={5} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="websiteUrl" render={({ field }) => (
          <FormItem><FormLabel>Course Website (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/course-details" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormField
            control={form.control}
            name="assignedStudentUids"
            render={() => (
                <FormItem>
                    <FormLabel>Assign Students (Optional)</FormLabel>
                    <div className="max-h-48 overflow-y-auto p-3 border rounded-md space-y-2">
                        {availableStudents.length > 0 ? availableStudents.map((student) => (
                            <FormField
                                key={student.uid}
                                control={form.control}
                                name="assignedStudentUids"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(student.uid)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...(field.value || []), student.uid])
                                                        : field.onChange((field.value || []).filter(uid => uid !== student.uid));
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal text-sm">{student.displayName} ({student.usn})</FormLabel>
                                    </FormItem>
                                )}
                            />
                        )) : <p className="text-sm text-muted-foreground">No students in your assigned branches.</p>}
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Course' : 'Create Course'}
        </Button>
      </form>
    </Form>
  );
}
