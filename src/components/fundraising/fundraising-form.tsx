
"use client";

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { FundraisingCampaign, UserProfile, Branch } from '@/types';
import { User } from '@/components/auth-provider';
import { Loader2, UploadCloud, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';

const MAX_QR_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_QR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fundraisingFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000),
  contactDetails: z.string().min(10, "Contact details are required.").max(200),
  duration: z.object({
    from: z.date({ required_error: "Start date is required." }),
    to: z.date({ required_error: "End date is required." }),
  }),
  targetBranches: z.array(z.string()).min(1, "At least one branch must be selected."),
  qrCode: z.any().refine(files => files instanceof FileList && files.length > 0, "QR code image is required.")
    .refine(files => files?.[0]?.size <= MAX_QR_SIZE, `QR code image must be less than 1MB.`)
    .refine(files => ALLOWED_QR_TYPES.includes(files?.[0]?.type), "Only .jpg, .png, and .webp formats are supported."),
});

type FundraisingFormValues = z.infer<typeof fundraisingFormSchema>;

interface FundraisingFormProps {
  onSubmitSuccess: () => void;
  initialData?: FundraisingCampaign;
  facultyUser: User;
}

export function FundraisingForm({ onSubmitSuccess, initialData, facultyUser }: FundraisingFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | undefined>(initialData?.qrCodeDataUrl);

  const form = useForm<FundraisingFormValues>({
    resolver: zodResolver(fundraisingFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      contactDetails: initialData?.contactDetails || "",
      duration: initialData ? { from: new Date(initialData.startDate), to: new Date(initialData.endDate) } : undefined,
      targetBranches: initialData?.targetBranches || facultyUser.assignedBranches || [],
    },
  });

  const handleQrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('qrCode', event.target.files);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FundraisingFormValues) => {
    if (!facultyUser) return;
    setIsLoading(true);

    let qrCodeDataUrl = qrPreview;
    if (data.qrCode && data.qrCode.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(data.qrCode[0]);
      qrCodeDataUrl = await new Promise(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
      });
    }

    if (!qrCodeDataUrl) {
      toast({ title: "QR Code Missing", description: "Please upload a QR code image.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const newCampaign: FundraisingCampaign = {
      id: initialData?.id || crypto.randomUUID(),
      ...data,
      startDate: data.duration.from.toISOString(),
      endDate: data.duration.to.toISOString(),
      qrCodeDataUrl,
      createdByUid: facultyUser.uid,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    const allCampaignsStr = localStorage.getItem("apsconnect_fundraising_campaigns");
    let allCampaigns = allCampaignsStr ? JSON.parse(allCampaignsStr) : [];
    if (initialData) {
      allCampaigns = allCampaigns.map((c: FundraisingCampaign) => c.id === initialData.id ? newCampaign : c);
    } else {
      allCampaigns.push(newCampaign);
    }
    localStorage.setItem("apsconnect_fundraising_campaigns", JSON.stringify(allCampaigns));
    
    toast({ title: initialData ? "Campaign Updated" : "Campaign Created", description: `"${newCampaign.title}" has been processed.` });
    onSubmitSuccess();
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Campaign Title</FormLabel><FormControl><Input placeholder="e.g., Annual Charity Drive" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the purpose of the fundraiser." {...field} disabled={isLoading} rows={4} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="contactDetails" render={({ field }) => (
            <FormItem><FormLabel>Contact Details</FormLabel><FormControl><Input placeholder="e.g., Prof. John Doe - 9876543210" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="duration" render={({ field }) => (
          <FormItem><FormLabel>Campaign Duration</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isLoading}>
                    {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value as DateRange} onSelect={field.onChange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          <FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="targetBranches" render={() => (
            <FormItem>
              <FormLabel>Target Branches</FormLabel>
              <FormDescription>Select the branches this campaign is for.</FormDescription>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md">
                {(facultyUser.assignedBranches || []).map((branch) => (
                  <FormField key={branch} control={form.control} name="targetBranches" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value?.includes(branch)} onCheckedChange={(checked) => {
                        return checked ? field.onChange([...(field.value || []), branch]) : field.onChange((field.value || []).filter(v => v !== branch));
                    }} /></FormControl><FormLabel className="font-normal">{branch}</FormLabel></FormItem>
                  )} />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="qrCode" render={({ field }) => (
          <FormItem><FormLabel>Payment QR Code</FormLabel>
            <FormControl>
                <div className="flex items-center gap-4">
                    {qrPreview && <img src={qrPreview} alt="QR Code Preview" className="h-24 w-24 border rounded-md" />}
                    <div className="flex-1"><Input type="file" onChange={handleQrChange} accept={ALLOWED_QR_TYPES.join(',')} disabled={isLoading} /></div>
                </div>
            </FormControl>
            <FormDescription>Upload a PNG or JPG image of the QR code for payment (Max 1MB).</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {initialData ? 'Update Campaign' : 'Create Campaign'}
        </Button>
      </form>
    </Form>
  );
}
