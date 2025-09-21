
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, User } from '@/components/auth-provider';
import type { UserProfile, EducationEntry, ExperienceEntry, ProjectEntry, SkillEntry, CertificationEntry, AchievementEntry } from '@/types'; 
import { Loader2, ShieldCheck, Camera, Trash2, ArrowLeft, UserCog, Bell, PlusCircle, FileDown, Shield, KeyRound, Mail, Briefcase } from 'lucide-react'; 
import Link from 'next/link';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/components/content/post-item-utils';
import { generateRandomId } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// --- Form Schemas ---

const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters.").optional().or(z.literal('')),
  summary: z.string().max(1000, "Summary too long.").optional().or(z.literal('')),
  phoneNumber: z.string().max(20, "Phone number too long.").optional().or(z.literal('')),
  linkedinUrl: z.string().url("Invalid LinkedIn URL.").optional().or(z.literal('')),
  githubUrl: z.string().url("Invalid GitHub URL.").optional().or(z.literal('')),
  portfolioUrl: z.string().url("Invalid Portfolio URL.").optional().or(z.literal('')),
  pronouns: z.string().max(50, "Pronouns cannot exceed 50 characters.").optional().or(z.literal('')),
  
  // Resume Sections
  education: z.array(z.object({ id: z.string(), degree: z.string().min(1, "Degree is required."), institution: z.string().min(1, "Institution is required."), graduationYear: z.string().min(4, "Year is required.").max(4), score: z.string().min(1, "Score/GPA is required."), })).optional(),
  experience: z.array(z.object({ id: z.string(), title: z.string().min(1, "Job title is required."), company: z.string().min(1, "Company name is required."), duration: z.string().min(1, "Duration is required."), description: z.string().min(1, "Description is required."), })).optional(),
  projects: z.array(z.object({ id: z.string(), title: z.string().min(1, "Project title is required."), description: z.string().min(1, "Description is required."), link: z.string().url("Invalid link.").optional().or(z.literal('')), })).optional(),
  skills: z.array(z.object({ id: z.string(), name: z.string().min(1, "Skill name is required.") })).optional(),
  certifications: z.array(z.object({ id: z.string(), name: z.string().min(1, "Certification name is required."), issuingBody: z.string().min(1, "Issuing body is required."), year: z.string().min(4, "Year is required.").max(4), })).optional(),
  achievements: z.array(z.object({ id: z.string(), description: z.string().min(1, "Achievement is required.") })).optional(),

  // Alumni Fields
  placementCompany: z.string().max(100, "Company name too long.").optional().or(z.literal('')),
  placementJobTitle: z.string().max(100, "Job title too long.").optional().or(z.literal('')),
  referralInfo: z.string().max(1000, "Referral information too long.").optional().or(z.literal('')),
});

const passwordSchema = z.object({
    oldPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(6, "New password must be at least 6 characters."),
    confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"],
});

const emailSchema = z.object({
    newEmail: z.string().email("Invalid email address."),
    confirmNewEmail: z.string().email("Invalid email address."),
}).refine(data => data.newEmail === data.confirmNewEmail, {
    message: "Email addresses don't match",
    path: ["confirmNewEmail"],
});


type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;


const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isLoading: authLoading, updateUserContext } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { displayName: "", summary: "", phoneNumber: "", linkedinUrl: "", githubUrl: "", portfolioUrl: "", pronouns: "", education: [], experience: [], projects: [], skills: [], certifications: [], achievements: [], placementCompany: "", placementJobTitle: "", referralInfo: "" } });
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { oldPassword: "", newPassword: "", confirmNewPassword: "" }});
  const emailForm = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema), defaultValues: { newEmail: "", confirmNewEmail: "" }});

  // Field arrays for resume sections
  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({ control: profileForm.control, name: "education" });
  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({ control: profileForm.control, name: "experience" });
  const { fields: projectFields, append: appendProject, remove: removeProject } = useFieldArray({ control: profileForm.control, name: "projects" });
  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control: profileForm.control, name: "skills" });
  const { fields: certificationFields, append: appendCertification, remove: removeCertification } = useFieldArray({ control: profileForm.control, name: "certifications" });
  const { fields: achievementFields, append: appendAchievement, remove: removeAchievement } = useFieldArray({ control: profileForm.control, name: "achievements" });


  useEffect(() => {
    if (!authLoading) {
      if (!authUser) {
        router.push('/login');
      } else {
        if (typeof window !== 'undefined') {
          const profileKey = `apsconnect_user_${authUser.uid}`;
          const profileStr = localStorage.getItem(profileKey);
          if (profileStr) {
            const fetchedProfile = JSON.parse(profileStr) as UserProfile;
            setUserProfile(fetchedProfile);
            profileForm.reset({
              displayName: fetchedProfile.displayName || "", summary: fetchedProfile.summary || "", phoneNumber: fetchedProfile.phoneNumber || "",
              linkedinUrl: fetchedProfile.linkedinUrl || "", githubUrl: fetchedProfile.githubUrl || "", portfolioUrl: fetchedProfile.portfolioUrl || "", pronouns: fetchedProfile.pronouns || "",
              education: fetchedProfile.education || [], experience: fetchedProfile.experience || [], projects: fetchedProfile.projects || [],
              skills: fetchedProfile.skills || [], certifications: fetchedProfile.certifications || [], achievements: fetchedProfile.achievements || [],
              placementCompany: fetchedProfile.placementCompany || "", placementJobTitle: fetchedProfile.placementJobTitle || "", referralInfo: fetchedProfile.referralInfo || "",
            });
            setAvatarPreview(fetchedProfile.avatarDataUrl);
          } else {
            toast({ title: "Profile Error", description: "Could not load your profile data.", variant: "destructive"});
            router.push('/dashboard'); 
          }
        }
        setPageLoading(false);
      }
    }
  }, [authUser, authLoading, router, profileForm, toast]);


  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast({ title: "File too large", description: "Avatar image must be less than 2MB.", variant: "destructive" }); return; }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) { toast({ title: "Invalid File Type", description: "Please upload a PNG, JPG, or GIF.", variant: "destructive" }); return; }
      try {
        const dataUrl = await readFileAsDataURL(file);
        setAvatarPreview(dataUrl);
      } catch (error) {
        toast({ title: "Error processing image", variant: "destructive" });
      }
    }
  };
  
  const removeAvatar = () => {
    setAvatarPreview(undefined);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };


  async function onProfileSubmit(data: ProfileFormValues) {
    setIsSaving(true);
    if (!userProfile || !authUser) {
      toast({ title: "Error", description: "User session not found.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    const updatedProfileData: UserProfile = { 
        ...userProfile,
        displayName: data.displayName || userProfile.displayName, summary: data.summary, phoneNumber: data.phoneNumber,
        linkedinUrl: data.linkedinUrl, githubUrl: data.githubUrl, portfolioUrl: data.portfolioUrl, pronouns: data.pronouns,
        education: data.education, experience: data.experience, projects: data.projects, skills: data.skills,
        certifications: data.certifications, achievements: data.achievements, avatarDataUrl: avatarPreview,
        placementCompany: data.placementCompany, placementJobTitle: data.placementJobTitle, referralInfo: data.referralInfo,
    };
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`apsconnect_user_${userProfile.uid}`, JSON.stringify(updatedProfileData));
        if (authUser.uid === userProfile.uid) {
            updateUserContext({ ...authUser, ...updatedProfileData });
        }
      }
      toast({ title: "Profile Updated", description: "Your profile details have been saved.", duration: 3000 });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }
  
  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsSaving(true);
    if (!userProfile || !userProfile.password) {
        toast({ title: "Error", description: "Cannot verify current password.", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    if (data.oldPassword !== userProfile.password) {
        passwordForm.setError("oldPassword", { type: "manual", message: "Current password does not match." });
        setIsSaving(false);
        return;
    }

    const updatedProfileData = { ...userProfile, password: data.newPassword };
    localStorage.setItem(`apsconnect_user_${userProfile.uid}`, JSON.stringify(updatedProfileData));
    toast({ title: "Password Updated", description: "Your password has been changed successfully.", duration: 3000 });
    passwordForm.reset();
    setIsSaving(false);
  }
  
  async function onEmailSubmit(data: EmailFormValues) {
    setIsSaving(true);
     if (!userProfile) { toast({ title: "Error", description: "User session not found.", variant: "destructive" }); setIsSaving(false); return; }
     
    // Check if new email already exists
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apsconnect_user_') && key !== `apsconnect_user_${userProfile.uid}`) {
            const profileStr = localStorage.getItem(key);
            if(profileStr){
                const existingProfile = JSON.parse(profileStr) as UserProfile;
                if(existingProfile.email.toLowerCase() === data.newEmail.toLowerCase()){
                    emailForm.setError("newEmail", { type: "manual", message: "This email is already in use." });
                    setIsSaving(false);
                    return;
                }
            }
        }
    }
    
    const oldKey = `apsconnect_user_${userProfile.uid}`;
    const newUid = data.newEmail.toLowerCase();
    const newKey = `apsconnect_user_${newUid}`;

    const updatedProfileData: UserProfile = { ...userProfile, email: data.newEmail.toLowerCase(), uid: newUid };
    
    localStorage.setItem(newKey, JSON.stringify(updatedProfileData));
    localStorage.removeItem(oldKey);
    
    // Update auth context
    const updatedAuthUser: User = { ...authUser!, email: newUid, uid: newUid };
    updateUserContext(updatedAuthUser);
    
    toast({ title: "Email Updated", description: "Your email has been changed. Please note your UID for login has also changed.", duration: 5000 });
    emailForm.reset();
    setUserProfile(updatedProfileData); // Update local state to re-render with new email
    setIsSaving(false);
  }

  const handleGenerateResume = async () => {
    toast({
      title: "Feature Coming Soon",
      description: "Resume generation will be available in a future update.",
      duration: 3000,
    });
  };

  if (pageLoading || authLoading) return <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  if (!authUser || !userProfile) return <div className="container mx-auto px-4 py-8 text-center"><Card className="w-full max-w-md mx-auto shadow-xl"><CardHeader><CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" /><p className="text-md sm:text-lg text-muted-foreground">You must be logged in to view this page.</p><Link href="/login"><Button variant="outline" className="mt-6">Go to Login</Button></Link></CardContent></Card></div>;
  
  const isStudent = userProfile.role === 'student';
  const isAlumni = userProfile.role === 'alumni';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6"><Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-4 w-4" /></Button></div>
      <Card className="w-full max-w-4xl mx-auto shadow-xl">
        <CardHeader><CardTitle className="text-2xl font-bold tracking-tight text-primary">Profile & Resume Settings</CardTitle><CardDescription>Manage your public profile and account security.</CardDescription></CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="text-xl font-semibold">General Profile</AccordionTrigger>
                    <AccordionContent>
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8 pt-4">
                                <div className="flex flex-col items-center space-y-4">
                                    <Avatar className="h-32 w-32 ring-4 ring-primary/20 shadow-lg"><AvatarImage src={avatarPreview} alt={userProfile.displayName || "User Avatar"} /><AvatarFallback className="text-4xl bg-muted text-muted-foreground">{getInitials(userProfile.displayName)}</AvatarFallback></Avatar>
                                    <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Camera className="mr-2 h-4 w-4"/> Change Photo</Button><input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/png, image/jpeg, image/gif" className="hidden" />{avatarPreview && <Button type="button" variant="destructive" size="sm" onClick={removeAvatar}><Trash2 className="mr-2 h-4 w-4"/> Remove</Button>}</div>
                                </div>
                                
                                {isAlumni && (
                                    <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                        <CardHeader className="p-0 pb-4">
                                            <CardTitle className="text-lg flex items-center gap-2"><Briefcase/> Placement Information</CardTitle>
                                            <CardDescription>Share your career journey with current students.</CardDescription>
                                        </CardHeader>
                                        <div className="space-y-4">
                                            <FormField control={profileForm.control} name="placementCompany" render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} placeholder="e.g., Google, Microsoft" /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={profileForm.control} name="placementJobTitle" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} placeholder="e.g., Software Engineer, Product Manager" /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={profileForm.control} name="referralInfo" render={({ field }) => (<FormItem><FormLabel>Referral Information</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="How can students reach out for referrals? e.g., 'Connect with me on LinkedIn and send a message with your resume.'"/></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </Card>
                                )}

                                <Card className="p-6"><CardHeader className="p-0 pb-4"><CardTitle className="text-lg">Personal & Contact Information</CardTitle></CardHeader>
                                    <div className="space-y-4">
                                        {userProfile.usn && <FormItem><FormLabel>USN</FormLabel><FormControl><Input value={userProfile.usn} disabled /></FormControl></FormItem>}
                                        <FormField control={profileForm.control} name="displayName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={profileForm.control} name="pronouns" render={({ field }) => (<FormItem><FormLabel>Pronouns (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={profileForm.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} type="tel" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={profileForm.control} name="linkedinUrl" render={({ field }) => (<FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={profileForm.control} name="githubUrl" render={({ field }) => (<FormItem><FormLabel>GitHub URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={profileForm.control} name="portfolioUrl" render={({ field }) => (<FormItem><FormLabel>Portfolio/Website URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={profileForm.control} name="summary" render={({ field }) => (<FormItem><FormLabel>Professional Summary</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </Card>
                                
                                {(isStudent || isAlumni) && (<>
                                    <ResumeSection title="Education" fields={educationFields} onRemove={removeEducation} onAdd={() => appendEducation({ id: generateRandomId(), degree: '', institution: '', graduationYear: '', score: '' })} renderFields={(field, index) => (<> <FormField control={profileForm.control} name={`education.${index}.degree`} render={({ field }) => (<FormItem><FormLabel>Degree</FormLabel><FormControl><Input {...field} placeholder="e.g., B.E. in Computer Science" /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`education.${index}.institution`} render={({ field }) => (<FormItem><FormLabel>Institution</FormLabel><FormControl><Input {...field} placeholder="e.g., APS College of Engineering" /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`education.${index}.graduationYear`} render={({ field }) => (<FormItem><FormLabel>Graduation Year</FormLabel><FormControl><Input {...field} placeholder="e.g., 2025" /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`education.${index}.score`} render={({ field }) => (<FormItem><FormLabel>Score/GPA</FormLabel><FormControl><Input {...field} placeholder="e.g., 8.5 CGPA" /></FormControl><FormMessage /></FormItem>)} /> </>)} />
                                    <ResumeSection title="Experience" fields={experienceFields} onRemove={removeExperience} onAdd={() => appendExperience({ id: generateRandomId(), title: '', company: '', duration: '', description: '' })} renderFields={(field, index) => (<> <FormField control={profileForm.control} name={`experience.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`experience.${index}.company`} render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`experience.${index}.duration`} render={({ field }) => (<FormItem><FormLabel>Duration</FormLabel><FormControl><Input {...field} placeholder="e.g., Jun 2023 - Aug 2023" /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`experience.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} /> </>)} />
                                    <ResumeSection title="Projects" fields={projectFields} onRemove={removeProject} onAdd={() => appendProject({ id: generateRandomId(), title: '', description: '', link: '' })} renderFields={(field, index) => (<> <FormField control={profileForm.control} name={`projects.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Project Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`projects.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`projects.${index}.link`} render={({ field }) => (<FormItem><FormLabel>Project Link (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> </>)} />
                                    <ResumeSection title="Skills" fields={skillFields} onRemove={removeSkill} onAdd={() => appendSkill({ id: generateRandomId(), name: '' })} renderFields={(field, index) => ( <FormField control={profileForm.control} name={`skills.${index}.name`} render={({ field }) => (<FormItem className="col-span-full"><FormLabel>Skill</FormLabel><FormControl><Input {...field} placeholder="e.g., React, Python, UI/UX Design" /></FormControl><FormMessage /></FormItem>)} /> )} />
                                    <ResumeSection title="Certifications" fields={certificationFields} onRemove={removeCertification} onAdd={() => appendCertification({ id: generateRandomId(), name: '', issuingBody: '', year: '' })} renderFields={(field, index) => (<> <FormField control={profileForm.control} name={`certifications.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Certification Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`certifications.${index}.issuingBody`} render={({ field }) => (<FormItem><FormLabel>Issuing Body</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> <FormField control={profileForm.control} name={`certifications.${index}.year`} render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> </>)} />
                                    <ResumeSection title="Achievements" fields={achievementFields} onRemove={removeAchievement} onAdd={() => appendAchievement({ id: generateRandomId(), description: '' })} renderFields={(field, index) => ( <FormField control={profileForm.control} name={`achievements.${index}.description`} render={({ field }) => (<FormItem className="col-span-full"><FormLabel>Achievement</FormLabel><FormControl><Input {...field} placeholder="e.g., Won first place in Hackathon 2023" /></FormControl><FormMessage /></FormItem>)} /> )} />
                                </>)}
                                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
                                    <Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Profile...</> : "Save Profile Changes"}</Button>
                                    {(isStudent || isAlumni) && (<Button type="button" variant="outline" onClick={handleGenerateResume} disabled={isSaving}><FileDown className="mr-2 h-4 w-4" /> Generate Resume</Button>)}
                                </div>
                            </form>
                        </Form>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger className="text-xl font-semibold">Security</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-8">
                        {userProfile.role !== 'student' && (
                            <Card className="p-6">
                                <CardHeader className="p-0 pb-4"><CardTitle className="text-lg flex items-center gap-2"><Mail/>Change Email</CardTitle></CardHeader>
                                <Form {...emailForm}>
                                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                                        <FormItem><FormLabel>Current Email</FormLabel><FormControl><Input value={userProfile.email} disabled /></FormControl></FormItem>
                                        <FormField control={emailForm.control} name="newEmail" render={({ field }) => (<FormItem><FormLabel>New Email</FormLabel><FormControl><Input {...field} type="email" placeholder="new.email@example.com" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={emailForm.control} name="confirmNewEmail" render={({ field }) => (<FormItem><FormLabel>Confirm New Email</FormLabel><FormControl><Input {...field} type="email" placeholder="new.email@example.com" /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Change Email"}</Button>
                                    </form>
                                </Form>
                            </Card>
                        )}
                        <Card className="p-6">
                            <CardHeader className="p-0 pb-4"><CardTitle className="text-lg flex items-center gap-2"><KeyRound/>Change Password</CardTitle></CardHeader>
                             <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    <FormField control={passwordForm.control} name="oldPassword" render={({ field }) => (<FormItem><FormLabel>Current Password</FormLabel><FormControl><Input {...field} type="password" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input {...field} type="password" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (<FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input {...field} type="password" /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Change Password"}</Button>
                                </form>
                            </Form>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

// Reusable component for resume sections
function ResumeSection({ title, fields, onRemove, onAdd, renderFields }: { title: string, fields: any[], onRemove: (index: number) => void, onAdd: () => void, renderFields: (field: any, index: number) => React.ReactNode }) {
    return (
        <Card className="p-6">
            <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={onAdd}><PlusCircle className="mr-2 h-4 w-4"/> Add</Button>
            </CardHeader>
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                        {renderFields(field, index)}
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                ))}
                {fields.length === 0 && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} added yet.</p>}
            </div>
        </Card>
    );
}
