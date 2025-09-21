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
import type { Branch, Semester, StudyMaterial, StudyMaterialAttachment } from '@/types';
import { defaultBranches, semesters } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { Loader2, UploadCloud, Paperclip, Trash2 } from 'lucide-react';

const MAX_FILE_SIZE_PER_MATERIAL = 10 * 1024 * 1024; // 10MB per file for study material
const ALLOWED_MATERIAL_TYPES = [
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg', 'image/png', 'image/gif',
  'application/zip', 'application/x-rar-compressed'
];
const BRANCH_STORAGE_KEY = 'apsconnect_managed_branches';

const studyMaterialFormSchema = z.object({
  branch: z.string({ required_error: "Branch is required." }),
  semester: z.custom<Semester>(val => semesters.includes(val as Semester), { required_error: "Semester is required." }),
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title too long."),
  description: z.string().max(500, "Description too long.").optional(),
  attachments: z.custom<FileList>((val) => val instanceof FileList && val.length > 0 , "At least one file is required.")
    .refine(files => {
        if (!files || files.length === 0) return false; // Should be caught by custom message above
        return Array.from(files).every(file => file.size <= MAX_FILE_SIZE_PER_MATERIAL);
    }, `Each file must be less than ${MAX_FILE_SIZE_PER_MATERIAL / (1024*1024)}MB.`)
    .refine(files => {
        if (!files || files.length === 0) return false;
        return Array.from(files).every(file => ALLOWED_MATERIAL_TYPES.includes(file.type));
    }, "Invalid file type. Allowed: PDF, Office Docs, Text, Images, ZIP, RAR."),
});

export type StudyMaterialFormValues = z.infer<typeof studyMaterialFormSchema>;

interface StudyMaterialFormProps {
  onSubmitSuccess: (newMaterial: StudyMaterial) => void;
  initialData?: StudyMaterial; // For editing
  availableBranches: Branch[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function StudyMaterialForm({ 
    onSubmitSuccess, 
    initialData, 
    availableBranches,
    isLoading,
    setIsLoading
}: StudyMaterialFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFilesDisplay, setSelectedFilesDisplay] = useState<File[]>([]);

  const form = useForm<StudyMaterialFormValues>({
    resolver: zodResolver(studyMaterialFormSchema),
    defaultValues: {
      branch: initialData?.branch || (availableBranches.length > 0 ? availableBranches[0] : undefined),
      semester: initialData?.semester || semesters[0],
      title: initialData?.title || "",
      description: initialData?.description || "",
      attachments: undefined,
    },
  });
  
  useEffect(() => {
    if (initialData?.branch && !form.getValues("branch")) {
        form.setValue("branch", initialData.branch);
    }
    if (initialData?.semester && !form.getValues("semester")) {
        form.setValue("semester", initialData.semester);
    }
    if (initialData?.attachments && initialData.attachments.length > 0 && selectedFilesDisplay.length === 0) {
      // For initial data, we can't recreate File objects perfectly, so just show names for editing UI.
      // The actual files would need to be re-selected by user if they want to change them.
      setSelectedFilesDisplay(initialData.attachments.map(att => new File([], att.name, {type: att.type})));
    }
  }, [initialData, form, selectedFilesDisplay.length, availableBranches]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFilesArray = Array.from(files);
       if (newFilesArray.some(file => file.size > MAX_FILE_SIZE_PER_MATERIAL)) {
        toast({ title: "File Too Large", description: `One or more files exceed the ${MAX_FILE_SIZE_PER_MATERIAL / (1024*1024)}MB limit.`, variant: "destructive", duration: 3000 });
        form.setValue('attachments', undefined);
        event.target.value = ""; 
        setSelectedFilesDisplay([]);
        return;
      }
       if (newFilesArray.some(file => !ALLOWED_MATERIAL_TYPES.includes(file.type))) {
        toast({ title: "Invalid File Type", description: `One or more files have an unsupported type.`, variant: "destructive", duration: 3000 });
        form.setValue('attachments', undefined);
        event.target.value = "";
        setSelectedFilesDisplay([]);
        return;
      }
      setSelectedFilesDisplay(newFilesArray);
      form.setValue('attachments', files, { shouldValidate: true });
    } else {
      setSelectedFilesDisplay([]);
      form.setValue('attachments', undefined, { shouldValidate: true });
    }
  };
  
  const removeFile = (fileName: string) => {
    const currentInput = document.getElementById('material-attachments') as HTMLInputElement;
    const currentDt = new DataTransfer();
    const newSelectedFiles = selectedFilesDisplay.filter(file => file.name !== fileName);

    newSelectedFiles.forEach(file => currentDt.items.add(file));
    
    if (currentInput) currentInput.files = currentDt.files.length > 0 ? currentDt.files : null;
    setSelectedFilesDisplay(newSelectedFiles);
    form.setValue('attachments', currentDt.files.length > 0 ? currentDt.files : undefined, { shouldValidate: true });
  };


  const onSubmit = async (data: StudyMaterialFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const uploadedAttachments: StudyMaterialAttachment[] = [];
    if (data.attachments) {
      for (const file of Array.from(data.attachments)) {
        // Mock file handling: In a real app, upload to a server and get URL
        // For now, we'll use a mock ID.
        uploadedAttachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          mockFileId: crypto.randomUUID(), // Simulate a unique ID for the stored file
        });
      }
    }
    
    const newMaterial: StudyMaterial = {
      id: initialData?.id || crypto.randomUUID(),
      branch: data.branch,
      semester: data.semester,
      title: data.title,
      description: data.description,
      attachments: uploadedAttachments,
      uploadedByUid: user.uid,
      uploadedByDisplayName: user.displayName || user.email || 'Unknown User',
      uploadedAt: initialData?.uploadedAt || new Date().toISOString(), 
    };
    
    if (initialData?.id) { // If editing, preserve original upload date
        newMaterial.uploadedAt = initialData.uploadedAt;
    }


    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

    onSubmitSuccess(newMaterial);
    toast({ title: initialData ? "Material Updated" : "Material Uploaded", description: `"${newMaterial.title}" processed.` });
    form.reset({
        branch: data.branch, // Keep branch and sem for easier subsequent uploads
        semester: data.semester,
        title: "",
        description: "",
        attachments: undefined,
    });
    setSelectedFilesDisplay([]);
    const fileInput = document.getElementById('material-attachments') as HTMLInputElement | null;
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
              <FormControl><Input placeholder="e.g., Unit 1 Notes - Data Structures" {...field} disabled={isLoading} /></FormControl>
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
              <FormControl><Textarea placeholder="Briefly describe the material..." {...field} disabled={isLoading} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="attachments"
          render={() => ( 
            <FormItem>
              <FormLabel>Material File(s)</FormLabel>
                <FormControl>
                <div className="relative flex items-center justify-center w-full">
                    <label htmlFor="material-attachments" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                            <p className="text-xs text-muted-foreground">PDF, Docs, Images, ZIP etc. (Max 10MB/file)</p>
                        </div>
                        <Input 
                            id="material-attachments" 
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
                You can upload multiple files for this material entry.
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
                    <Paperclip className="inline h-3 w-3 mr-1" />{file.name} ({ (file.size / (1024*1024)).toFixed(2) } MB)
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
          {initialData ? 'Update Material' : 'Upload Material'}
        </Button>
      </form>
    </Form>
  );
}