
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { getInitials } from '@/components/content/post-item-utils';
import { Mail, Briefcase, GraduationCap, Users, BookOpen, Linkedin, Github, Globe, Phone, User as UserIcon, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function PublicProfilePage() {
  const params = useParams();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const userId = params.userId as string;

  useEffect(() => {
    if (!authLoading) {
      if (!authUser) {
        router.push('/login');
        return;
      }
      if (userId) {
        const profileKey = `apsconnect_user_${userId}`;
        const profileStr = localStorage.getItem(profileKey);
        if (profileStr) {
          setProfile(JSON.parse(profileStr));
        }
      }
      setPageLoading(false);
    }
  }, [userId, authUser, authLoading, router]);

  if (pageLoading || authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }

  if (!profile) {
    return <div className="text-center py-10">Profile not found.</div>;
  }
  
  const isStudent = profile.role === 'student';
  const isAlumni = profile.role === 'alumni';

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card className="w-full shadow-xl">
        <CardHeader className="bg-muted/30 p-6 text-center">
            <Avatar className="h-32 w-32 mx-auto ring-4 ring-primary/20 shadow-lg">
                <AvatarImage src={profile.avatarDataUrl} />
                <AvatarFallback className="text-4xl">{getInitials(profile.displayName)}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4 text-3xl font-bold">{profile.displayName}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">{isStudent ? `${profile.branch} - ${profile.semester}` : (isAlumni ? profile.placementJobTitle || 'Alumni' : profile.facultyTitle || 'Faculty Member')}</CardDescription>
             {profile.pronouns && <p className="text-sm text-muted-foreground">({profile.pronouns})</p>}
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Contact & Placement Info */}
          <div className="md:col-span-1 md:border-r md:pr-6 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
            <InfoItem icon={Mail} text={profile.email} href={`mailto:${profile.email}`} />
            {profile.phoneNumber && <InfoItem icon={Phone} text={profile.phoneNumber} href={`tel:${profile.phoneNumber}`} />}
            {profile.linkedinUrl && <InfoItem icon={Linkedin} text="LinkedIn Profile" href={profile.linkedinUrl} isLink />}
            {profile.githubUrl && <InfoItem icon={Github} text="GitHub Profile" href={profile.githubUrl} isLink />}
            {profile.portfolioUrl && <InfoItem icon={Globe} text="Portfolio/Website" href={profile.portfolioUrl} isLink />}
             {isAlumni && (
                <div className="pt-4 mt-4 border-t">
                    <h3 className="font-semibold text-lg border-b pb-2 mb-3">Placement Details</h3>
                    {profile.placementCompany && <InfoItem icon={Briefcase} text={profile.placementCompany} />}
                    {profile.placementJobTitle && <InfoItem icon={UserIcon} text={profile.placementJobTitle} />}
                    {profile.referralInfo && <InfoItem icon={MessageCircle} text={profile.referralInfo} />}
                </div>
            )}
          </div>

          {/* Right Column - Resume Details */}
          <div className="md:col-span-2 space-y-6">
            {profile.summary && <ResumeDisplaySection title="Professional Summary" items={[profile.summary]} renderItem={(item) => <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item}</p>} />}
            {profile.education && profile.education.length > 0 && <ResumeDisplaySection title="Education" items={profile.education} renderItem={(item) => <div><p className="font-semibold">{item.degree}</p><p className="text-sm text-muted-foreground">{item.institution}</p><p className="text-xs text-muted-foreground">{item.graduationYear} &bull; Score: {item.score}</p></div>} />}
            {profile.experience && profile.experience.length > 0 && <ResumeDisplaySection title="Experience" items={profile.experience} renderItem={(item) => <div><p className="font-semibold">{item.title} at {item.company}</p><p className="text-xs text-muted-foreground">{item.duration}</p><p className="text-sm mt-1 whitespace-pre-wrap">{item.description}</p></div>} />}
            {profile.projects && profile.projects.length > 0 && <ResumeDisplaySection title="Projects" items={profile.projects} renderItem={(item) => <div><Link href={item.link || '#'} target="_blank" className="font-semibold text-primary hover:underline">{item.title}</Link><p className="text-sm mt-1 whitespace-pre-wrap">{item.description}</p></div>} />}
            {profile.skills && profile.skills.length > 0 && <ResumeDisplaySection title="Skills" items={profile.skills} renderItem={(item) => <Badge variant="secondary">{item.name}</Badge>} isBadgeList />}
            {profile.certifications && profile.certifications.length > 0 && <ResumeDisplaySection title="Certifications" items={profile.certifications} renderItem={(item) => <div><p className="font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.issuingBody} - {item.year}</p></div>} />}
            {profile.achievements && profile.achievements.length > 0 && <ResumeDisplaySection title="Achievements" items={profile.achievements} renderItem={(item) => <p className="text-sm text-muted-foreground">&bull; {item.description}</p>} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const InfoItem = ({ icon: Icon, text, href, isLink }: { icon: React.ElementType, text: string, href?: string, isLink?: boolean }) => (
  <div className="flex items-start text-sm">
    <Icon className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
    {href ? <Link href={href} target="_blank" rel="noopener noreferrer" className={isLink ? "text-primary hover:underline break-all" : "break-all"}>{text}</Link> : <span className="break-words">{text}</span>}
  </div>
);

const ResumeDisplaySection = ({ title, items, renderItem, isBadgeList }: { title: string, items: any[], renderItem: (item: any) => React.ReactNode, isBadgeList?: boolean }) => (
  <div>
    <h3 className="font-semibold text-lg border-b pb-2 mb-3">{title}</h3>
    <div className={isBadgeList ? "flex flex-wrap gap-2" : "space-y-3"}>
      {items.map((item, index) => <div key={index}>{renderItem(item)}</div>)}
    </div>
  </div>
);
