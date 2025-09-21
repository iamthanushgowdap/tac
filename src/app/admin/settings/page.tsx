
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Settings, UploadCloud, Mail, Users, Tool, Globe, GraduationCap } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';

// Mock storage key for these new settings
const SITE_SETTINGS_STORAGE_KEY = 'apsconnect_site_settings_v1';

interface SiteSettingsData {
  collegeLogoUrl?: string;
  contactEmail?: string;
  enableStudentRegistration?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedIn?: string;
  socialInstagram?: string;
  socialGithub?: string; // Added Github
  enableAlumniTransition?: boolean; // New setting
}

const defaultSiteSettings: SiteSettingsData = {
  collegeLogoUrl: '',
  contactEmail: 'info@apsconnect.example.com',
  enableStudentRegistration: true,
  maintenanceMode: false,
  maintenanceMessage: 'APSConnect is currently undergoing scheduled maintenance. We will be back shortly. Thank you for your patience.',
  socialFacebook: '',
  socialTwitter: '',
  socialLinkedIn: '',
  socialInstagram: '',
  socialGithub: '', // Added Github
  enableAlumniTransition: false, // Default to off
};


export default function AdminSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [pageLoading, setPageLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettingsData>(defaultSiteSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push(user ? '/dashboard' : '/login');
        return; // Ensure no further execution if redirecting
      }
      // Load settings from localStorage
      if (typeof window !== 'undefined') {
        const storedSettings = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
        if (storedSettings) {
          try {
            // Merge stored settings with defaults to handle new properties
            setSettings({ ...defaultSiteSettings, ...JSON.parse(storedSettings) });
          } catch (e) {
            console.error("Failed to parse site settings, using defaults.", e);
            setSettings(defaultSiteSettings);
          }
        } else {
          setSettings(defaultSiteSettings);
        }
      }
      setPageLoading(false);
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: keyof SiteSettingsData, checked: boolean) => {
    setSettings(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File too large", description: "Logo image must be less than 2MB.", variant: "destructive" });
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload a PNG, JPG, or SVG.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, collegeLogoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      toast({
        title: "Settings Saved",
        description: "Site settings have been updated successfully.",
        duration: 3000,
      });
    }
    setIsSaving(false);
  };


  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Site Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure general application settings and preferences.
            </p>
          </div>
        </div>
         <Link href="/admin">
            <Button variant="outline">Back to Admin Dashboard</Button>
          </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Column 1: General & Appearance */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">General & Appearance</CardTitle>
            <CardDescription>Manage basic site information and visual elements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="collegeLogoUrl">College Logo</Label>
              <div className="flex items-center gap-4">
                {settings.collegeLogoUrl && (
                  <img src={settings.collegeLogoUrl} alt="College Logo Preview" className="h-16 w-auto border rounded bg-muted p-1" data-ai-hint="logo building" />
                )}
                <label htmlFor="logo-upload-input" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center w-full p-2 border-2 border-dashed rounded-md hover:border-primary transition-colors">
                        <UploadCloud className="h-6 w-6 text-muted-foreground mr-2" />
                        <span className="text-sm text-muted-foreground">
                            {settings.collegeLogoUrl ? 'Change logo' : 'Upload logo'}
                        </span>
                    </div>
                    <Input id="logo-upload-input" name="collegeLogoUrl" type="file" className="sr-only" onChange={handleLogoUpload} accept="image/png, image/jpeg, image/svg+xml" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Recommended: SVG or PNG format. Max 2MB.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="e.g., contact@apsconnect.example.com"
                value={settings.contactEmail || ''}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">Public contact email for inquiries.</p>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Functionality & Social */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Functionality & Social</CardTitle>
            <CardDescription>Control site features and link social media profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <div className="space-y-0.5">
                <Label htmlFor="enableStudentRegistration" className="text-base">Enable Student Registration</Label>
                <p className="text-xs text-muted-foreground">Allow new students to register accounts.</p>
              </div>
              <Switch
                id="enableStudentRegistration"
                checked={settings.enableStudentRegistration}
                onCheckedChange={(checked) => handleSwitchChange('enableStudentRegistration', checked)}
              />
            </div>
            
             <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
              <div className="space-y-0.5">
                <Label htmlFor="enableAlumniTransition" className="text-base flex items-center gap-2"><GraduationCap className="h-5 w-5"/>Enable Alumni Transition</Label>
                <p className="text-xs text-muted-foreground">Show "Switch to Alumni" option for 8th sem students on their dashboard.</p>
              </div>
              <Switch
                id="enableAlumniTransition"
                checked={settings.enableAlumniTransition}
                onCheckedChange={(checked) => handleSwitchChange('enableAlumniTransition', checked)}
              />
            </div>
            
            <div className="space-y-2">
                <div className="flex items-center justify-between space-x-2 mb-2">
                    <Label htmlFor="maintenanceMode" className="text-base">Maintenance Mode</Label>
                    <Switch
                        id="maintenanceMode"
                        checked={settings.maintenanceMode}
                        onCheckedChange={(checked) => handleSwitchChange('maintenanceMode', checked)}
                    />
                </div>
                <p className="text-xs text-muted-foreground -mt-1">Temporarily disable access to the site for non-admins.</p>
                {settings.maintenanceMode && (
                    <Textarea
                    id="maintenanceMessage"
                    name="maintenanceMessage"
                    placeholder="Enter maintenance message..."
                    value={settings.maintenanceMessage || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-2"
                    />
                )}
            </div>

            <div className="space-y-4 pt-4 border-t">
                <h4 className="text-md font-semibold text-foreground flex items-center"><Globe className="mr-2 h-5 w-5"/> Social Media Links</h4>
                <div className="space-y-2">
                    <Label htmlFor="socialFacebook">Facebook URL</Label>
                    <Input id="socialFacebook" name="socialFacebook" placeholder="https://facebook.com/yourcollege" value={settings.socialFacebook || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="socialTwitter">Twitter/X URL</Label>
                    <Input id="socialTwitter" name="socialTwitter" placeholder="https://twitter.com/yourcollege" value={settings.socialTwitter || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="socialLinkedIn">LinkedIn URL</Label>
                    <Input id="socialLinkedIn" name="socialLinkedIn" placeholder="https://linkedin.com/school/yourcollege" value={settings.socialLinkedIn || ''} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="socialInstagram">Instagram URL</Label>
                    <Input id="socialInstagram" name="socialInstagram" placeholder="https://instagram.com/yourcollege" value={settings.socialInstagram || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="socialGithub">GitHub URL</Label>
                    <Input id="socialGithub" name="socialGithub" placeholder="https://github.com/yourcollege" value={settings.socialGithub || ''} onChange={handleInputChange} />
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8 flex justify-end">
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? <SimpleRotatingSpinner className="mr-2 h-4 w-4" /> : null}
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}

