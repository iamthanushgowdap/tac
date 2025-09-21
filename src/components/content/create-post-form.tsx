"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Branch, defaultBranches, PostCategory, postCategories, Post, PostAttachment } from '@/types'; 
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Paperclip, Trash2, UploadCloud, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'video/mp4', 'video/webm', 'video/ogg'
];
const BRANCH_STORAGE_KEY = 'apsconnect_managed_branches'; 

const postFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(150, "Title cannot exceed 150 characters."),
  content: z.string().min(20, "Content must be at least 20 characters.").max(5000, "Content cannot exceed 5000 characters."),
  category: z.enum(postCategories, { required_error: "Please select a category." }),
  targetAllBranches: z.boolean().default(false),
  targetBranches: z.array(z.string()).optional(), 
  attachments: z.custom<FileList>((val) => val instanceof FileList, "Please upload valid files.").optional()
    .refine(files => { 
      if (!files) return true;
      const totalSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);
      return totalSize <= MAX_TOTAL_SIZE;
    }, `Total file size should not exceed ${MAX_TOTAL_SIZE / (1024*1024)}MB.`)
    .refine(files => { 
        if (!files) return true;
        return Array.from(files).every(file => file.size <= MAX_FILE_SIZE);
    }, `Each file should not exceed ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => { 
        if (!files) return true;
        return Array.from(files).every(file => ALLOWED_FILE_TYPES.includes(file.type));
    }, "Invalid file type. Allowed types: images, PDF, Office documents, text files, common video formats."),
  eventDate: z.date().optional(),
  eventStartTime: z.string().optional().refine(val => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), { message: "Invalid time format (HH:MM)" }),
  eventEndTime: z.string().optional().refine(val => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), { message: "Invalid time format (HH:MM)" }),
  eventLocation: z.string().max(100, "Location too long").optional(),
}).refine(data => {
  if (!data.targetAllBranches && (!data.targetBranches || data.targetBranches.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "If not targeting all branches, at least one specific branch must be selected.",
  path: ["targetBranches"],
}).refine(data => {
  if ((data.category === 'event' || data.category === 'schedule') && (!data.eventDate || !data.eventStartTime)) {
    return false;
  }
  return true;
}, {
  message: "Event date and start time are required for Event/Schedule category.",
  path: ["eventDate"], 
});

export type PostFormValues = z.infer<typeof postFormSchema>;

interface CreatePostFormProps {
  onFormSubmit: (data: Post, attachmentsToUpload: File[]) => Promise<void>;
  initialData?: Post; 
  isLoading: boolean;
  submitButtonText?: string;
  formTitle?: string;
  formDescription?: string;
}

export function CreatePostForm({
  onFormSubmit,
  initialData,
  isLoading,
  submitButtonText = initialData ? 'Update Post' : 'Create Post',
  formTitle = initialData ? 'Edit Post' : 'Create New Post',
  formDescription = initialData ? 'Update the details of the post.' : 'Fill in the details to create a new post for the APSConnect community.',
}: CreatePostFormProps) {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialData?.attachments.map(att => new File([], att.name, {type: att.type})) ?? []); 
  const [availableBranches, setAvailableBranches] = useState<Branch[]>(defaultBranches);
  
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || postCategories[0],
      targetAllBranches: initialData ? (!initialData.targetBranches || initialData.targetBranches.length === 0) : true,
      targetBranches: initialData?.targetBranches || [],
      attachments: undefined,
      eventDate: initialData?.eventDate ? new Date(initialData.eventDate) : undefined,
      eventStartTime: initialData?.eventStartTime || "",
      eventEndTime: initialData?.eventEndTime || "",
      eventLocation: initialData?.eventLocation || "",
    },
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedBranches = localStorage.getItem(BRANCH_STORAGE_KEY);
      if (storedBranches) {
        try {
          const parsedBranches = JSON.parse(storedBranches);
          if (Array.isArray(parsedBranches) && parsedBranches.length > 0) {
            setAvailableBranches(parsedBranches);
          } else {
            setAvailableBranches(defaultBranches);
          }
        } catch (e) {
            console.error("Failed to parse branches for post form, using defaults:", e);
            setAvailableBranches(defaultBranches);
        }
      } else {
        setAvailableBranches(defaultBranches);
      }
    }
  }, []);

  const targetAllBranches = form.watch("targetAllBranches");
  const currentCategory = form.watch("category");

  useEffect(() => {
    if (targetAllBranches) {
      form.setValue("targetBranches", []);
    }
  }, [targetAllBranches, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFilesArray = Array.from(files);
      const currentTotalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
      const newFilesTotalSize = newFilesArray.reduce((acc, file) => acc + file.size, 0);

      if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_SIZE) {
        toast({ title: "File Limit Exceeded", description: `Total attachment size cannot exceed ${MAX_TOTAL_SIZE / (1024*1024)}MB.`, variant: "destructive", duration: 3000 });
        form.setValue('attachments', undefined); 
        event.target.value = ""; 
        return;
      }
      if (newFilesArray.some(file => file.size > MAX_FILE_SIZE)) {
        toast({ title: "File Too Large", description: `One or more files exceed the ${MAX_FILE_SIZE / (1024*1024)}MB limit.`, variant: "destructive", duration: 3000 });
        form.setValue('attachments', undefined);
         event.target.value = "";
        return;
      }
       if (newFilesArray.some(file => !ALLOWED_FILE_TYPES.includes(file.type))) {
        toast({ title: "Invalid File Type", description: `One or more files have an unsupported type.`, variant: "destructive", duration: 3000 });
        form.setValue('attachments', undefined);
         event.target.value = "";
        return;
      }
      setSelectedFiles(prev => [...prev, ...newFilesArray]); 
      const dataTransfer = new DataTransfer();
      selectedFiles.forEach(file => dataTransfer.items.add(file));
      newFilesArray.forEach(file => dataTransfer.items.add(file));
      form.setValue('attachments', dataTransfer.files.length > 0 ? dataTransfer.files : undefined, { shouldValidate: true });

    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    const currentFormFiles = form.getValues('attachments');
    if (currentFormFiles) {
        const newFileList = new DataTransfer();
        Array.from(currentFormFiles)
            .filter(file => file.name !== fileName)
            .forEach(file => newFileList.items.add(file));
        form.setValue('attachments', newFileList.files.length > 0 ? newFileList.files : undefined, { shouldValidate: true });
    }
  };


  const onSubmit = async (data: PostFormValues) => {
    if (!user || (user.role !== 'admin' && user.role !== 'faculty')) {
      toast({ title: "Unauthorized", description: "You are not authorized to create posts.", variant: "destructive", duration: 3000 });
      return;
    }

    let authorAvatarUrl: string | undefined = undefined;
    if (typeof window !== 'undefined') {
      const userProfileStr = localStorage.getItem(`apsconnect_user_${user.uid}`);
      if (userProfileStr) {
        const userProfile = JSON.parse(userProfileStr) as UserProfile;
        authorAvatarUrl = userProfile.avatarDataUrl;
      }
    }


    const filesToUpload: File[] = selectedFiles; 
    const newAttachments: PostAttachment[] = filesToUpload.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }));
    
    let finalAttachments = newAttachments;
    if (initialData?.id) {
        finalAttachments = selectedFiles.map(file => ({
             name: file.name,
             type: file.type,
             size: file.size,
        }));
    }


    const postData: Post = {
      id: initialData?.id || crypto.randomUUID(),
      title: data.title,
      content: data.content,
      category: data.category,
      targetBranches: data.targetAllBranches ? [] : data.targetBranches || [], 
      attachments: finalAttachments,
      authorId: user.uid,
      authorName: user.displayName || user.email || "APSConnect User",
      authorRole: user.role,
      authorAvatarUrl: authorAvatarUrl,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: initialData?.likes || [],
      eventDate: data.eventDate ? data.eventDate.toISOString().split('T')[0] : undefined, // Store as YYYY-MM-DD
      eventStartTime: data.eventStartTime,
      eventEndTime: data.eventEndTime,
      eventLocation: data.eventLocation,
    };
    await onFormSubmit(postData, filesToUpload);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight text-primary">{formTitle}</CardTitle>
        <ShadCnCardDescription>{formDescription}</ShadCnCardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="E.g., Upcoming Workshop on AI" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl><Textarea placeholder="Detailed description of the post..." {...field} rows={8} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {postCategories.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(currentCategory === 'event' || currentCategory === 'schedule') && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                 <h4 className="text-md font-semibold">Event/Schedule Details</h4>
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Event Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} // Disable past dates
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="eventStartTime" render={({ field }) => ( <FormItem> <FormLabel>Start Time (HH:MM)</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="eventEndTime" render={({ field }) => ( <FormItem> <FormLabel>End Time (HH:MM, Optional)</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                 </div>
                <FormField control={form.control} name="eventLocation" render={({ field }) => ( <FormItem> <FormLabel>Location (Optional)</FormLabel> <FormControl><Input placeholder="e.g., Auditorium, Online" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </div>
            )}


            <FormField
              control={form.control}
              name="targetAllBranches"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Target All Branches</FormLabel>
                    <FormDescription>Check this if the post is for all students and faculty, regardless of branch.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            {!targetAllBranches && (
              <FormField
                control={form.control}
                name="targetBranches"
                render={() => (
                  <FormItem>
                    <FormLabel>Target Specific Branches</FormLabel>
                    <FormDescription>
                      {availableBranches.length === 0 ? "No branches available for selection. Please add branches in Branch Management first or select 'Target All Branches'." : 
                       "Select the branches this post is relevant to."}
                    </FormDescription>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-2 border rounded-md">
                      {availableBranches.map((branch) => (
                        <FormField
                          key={branch}
                          control={form.control}
                          name="targetBranches"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(branch)}
                                  onCheckedChange={(checked) => {
                                    const newValue = field.value ? [...field.value] : [];
                                    if (checked) {
                                      newValue.push(branch);
                                    } else {
                                      const index = newValue.indexOf(branch);
                                      if (index > -1) newValue.splice(index, 1);
                                    }
                                    field.onChange(newValue);
                                  }}
                                  disabled={availableBranches.length === 0 && !defaultBranches.includes(branch)}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">{branch}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="attachments"
              render={({ field: { onChange, ...restField } }) => ( 
                <FormItem>
                  <FormLabel>Attachments (Optional)</FormLabel>
                   <FormControl>
                    <div className="relative flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">Max 5MB/file, 20MB total. Images, PDF, Docs, Videos.</p>
                            </div>
                            <Input 
                                id="file-upload" 
                                type="file" 
                                multiple 
                                className="sr-only" 
                                onChange={(e) => {
                                    handleFileChange(e); 
                                    onChange(e.target.files); // Ensure RHF's onChange is called
                                }}
                                {...restField} 
                            />
                        </label>
                    </div>
                  </FormControl>
                  <FormDescription>
                    You can upload multiple files. Allowed types: images, PDF, Office documents, text files, common video formats. Max 5MB per file, 20MB total.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Selected Files:</h4>
                <ul className="list-disc list-inside space-y-1 pl-1 max-h-32 overflow-y-auto rounded-md border p-2 bg-muted/20">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="text-xs flex items-center justify-between">
                      <span className="truncate max-w-[80%]">
                        <Paperclip className="inline h-3 w-3 mr-1" />{file.name} ({ (file.size / (1024*1024)).toFixed(2) } MB)
                      </span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeFile(file.name)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitButtonText}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
