
"use client";

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Semester, Assignment, AssignmentAttachment } from '@/types';
import { semesters } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { Loader2, UploadCloud, Paperclip, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_PER_ASSIGNMENT = 10 * 1024 * 1024; // 10MB
const ALLOWED_ASSIGNMENT_TYPES = [
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg', 'image/png', 'image/gif',
  'application/zip', 'application/x-rar-compressed'
];

const assignmentFormSchema = z.object({
  branch: z.string({ required_error: "Branch is required." }),
  semester: z.custom<Semester>(val => semesters.includes(val as Semester), { required_error: "Semester is required." }),
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title too long."),
  description: z.string().max(500, "Description too long.").optional(),
  dueDate: z.date().optional(),
  attachments: z.custom<FileList>()
    .refine(files => !files || files.length > 0, "At least one file is required if attachments are provided.")
    .refine(files => {
        if (!files) return true;
        return Array.from(files).every(file => file.size <= MAX_FILE_SIZE_PER_ASSIGNMENT);
    }, `Each file must be less than ${MAX_FILE_SIZE_PER_ASSIGNMENT / (1024*1024)}MB.`)
    .refine(files => {
        if (!files) return true;
        return Array.from(files).every(file => ALLOWED_ASSIGNMENT_TYPES.includes(file.type));
    }, "Invalid file type. Allowed: PDF, Office Docs, Text, Images, ZIP, RAR.").optional(),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface AssignmentFormProps {
  onSubmitSuccess: (newAssignment: Assignment) => void;
  initialData?: Assignment;
  availableBranches: Branch[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function AssignmentForm({ 
    onSubmitSuccess, 
    initialData, 
    availableBranches,
    isLoading,
    setIsLoading
}: AssignmentFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFilesDisplay, setSelectedFilesDisplay] = useState<File[]>([]);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      branch: initialData?.branch || (availableBranches.length > 0 ? availableBranches[0] : undefined),
      semester: initialData?.semester || semesters[0],
      title: initialData?.title || "",
      description: initialData?.description || "",
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
      attachments: undefined,
    },
  });
  
  useEffect(() => {
    if (initialData?.attachments && initialData.attachments.length > 0 && selectedFilesDisplay.length === 0) {
      setSelectedFilesDisplay(initialData.attachments.map(att => new File([], att.name, {type: att.type})));
    }
  }, [initialData, selectedFilesDisplay.length]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFilesArray = Array.from(files);
      // Validation checks
      setSelectedFilesDisplay(newFilesArray);
      form.setValue('attachments', files, { shouldValidate: true });
    } else {
      setSelectedFilesDisplay([]);
      form.setValue('attachments', undefined, { shouldValidate: true });
    }
  };
  
  const removeFile = (fileName: string) => {
    const currentInput = document.getElementById('assignment-attachments') as HTMLInputElement;
    const newSelectedFiles = selectedFilesDisplay.filter(file => file.name !== fileName);
    const dataTransfer = new DataTransfer();
    newSelectedFiles.forEach(file => dataTransfer.items.add(file));
    if (currentInput) currentInput.files = dataTransfer.files.length > 0 ? dataTransfer.files : null;
    setSelectedFilesDisplay(newSelectedFiles);
    form.setValue('attachments', dataTransfer.files.length > 0 ? dataTransfer.files : undefined, { shouldValidate: true });
  };

  const onSubmit = async (data: AssignmentFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const uploadedAttachments: AssignmentAttachment[] = [];
    if (data.attachments) {
      for (const file of Array.from(data.attachments)) {
        uploadedAttachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          mockFileId: crypto.randomUUID(),
        });
      }
    }
    
    const newAssignment: Assignment = {
      id: initialData?.id || crypto.randomUUID(),
      branch: data.branch,
      semester: data.semester,
      title: data.title,
      description: data.description,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : (initialData?.attachments || []),
      dueDate: data.dueDate ? data.dueDate.toISOString().split('T')[0] : undefined,
      postedByUid: user.uid,
      postedByDisplayName: user.displayName || user.email || 'Unknown User',
      postedAt: initialData?.postedAt || new Date().toISOString(), 
    };

    await new Promise(resolve => setTimeout(resolve, 1000));

    onSubmitSuccess(newAssignment);
    toast({ title: initialData ? "Assignment Updated" : "Assignment Posted", description: `"${newAssignment.title}" processed.` });
    form.reset({
        branch: data.branch,
        semester: data.semester,
        title: "",
        description: "",
        attachments: undefined,
        dueDate: undefined,
    });
    setSelectedFilesDisplay([]);
    const fileInput = document.getElementById('assignment-attachments') as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="branch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Branch</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {availableBranches.length > 0 ? availableBranches.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    )) : <SelectItem value="-" disabled>No branches available</SelectItem>}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="semester"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Semester</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl><Input placeholder="e.g., Data Structures - Week 5 Assignment" {...field} disabled={isLoading} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Instructions, topics covered, etc." {...field} disabled={isLoading} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a due date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="attachments"
          render={() => ( 
            <FormItem>
              <FormLabel>Attachment(s) (Optional)</FormLabel>
              <FormControl>
                <div className="relative flex items-center justify-center w-full">
                    <label htmlFor="assignment-attachments" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                            <p className="text-xs text-muted-foreground">PDF, Docs, Images, ZIP etc. (Max 10MB/file)</p>
                        </div>
                        <Input 
                            id="assignment-attachments" 
                            type="file" 
                            multiple 
                            className="sr-only" 
                            onChange={handleFileChange}
                            disabled={isLoading}
                        />
                    </label>
                </div>
              </FormControl>
              <FormDescription>
                {initialData ? "Re-upload files if you need to make changes to attachments." : "You can upload multiple files."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         {selectedFilesDisplay.length > 0 && (
            <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Files:</h4>
            <ul className="list-disc list-inside space-y-1 pl-1 max-h-32 overflow-y-auto rounded-md border p-2 bg-muted/20">
                {selectedFilesDisplay.map((file, index) => (
                <li key={index} className="text-xs flex items-center justify-between">
                    <span className="truncate max-w-[80%]">
                    <Paperclip className="inline h-3 w-3 mr-1" />{file.name}
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeFile(file.name)} disabled={isLoading}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                </li>
                ))}
            </ul>
            </div>
        )}

        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Assignment' : 'Post Assignment'}
        </Button>
      </form>
    </Form>
  );
}
