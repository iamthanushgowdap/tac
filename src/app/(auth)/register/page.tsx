
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription as ShadCnFormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription as ShadCnCardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, Branch, Semester } from "@/types";
import { defaultBranches, semesters } from "@/types";
import { Icons } from "@/components/icons";


const usnSuffixRegex = /^[0-9]{2}[A-Za-z]{2}[0-9]{3}$/;
const BRANCH_STORAGE_KEY = 'apsconnect_managed_branches';

const registerSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  usnSuffix: z.string()
    .length(7, { message: "USN Suffix must be 7 characters (e.g., 23CS001)." })
    .regex(usnSuffixRegex, { message: "Format: YYBBBNNN (e.g., 23CS001 where YY is year, BB branch, NNN roll no)." })
    .transform(val => {
      return val.substring(0, 2) + val.substring(2, 4).toUpperCase() + val.substring(4, 7);
    }),
  branch: z.string({ required_error: "Please select your branch." }),
  semester: z.string({ required_error: "Please select your semester." }) as z.ZodSchema<Semester>,
  pronouns: z.string().max(50, { message: "Pronouns cannot exceed 50 characters." }).optional().or(z.literal('')),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>(defaultBranches);

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
          console.error("Failed to parse branches from localStorage, using default:", e);
          setAvailableBranches(defaultBranches);
        }
      } else {
        setAvailableBranches(defaultBranches);
      }
    }
  }, []);


  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      usnSuffix: "",
      branch: undefined,
      semester: undefined,
      pronouns: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    const fullUsn = `1AP${data.usnSuffix}`;

    // Check if email already exists or USN already exists
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apsconnect_user_')) {
          const profileStr = localStorage.getItem(key);
          if (profileStr) {
            try {
              const existingProfile = JSON.parse(profileStr) as UserProfile;
              if (existingProfile.email && existingProfile.email.toLowerCase() === data.email.toLowerCase()) {
                toast({
                  title: "Registration Failed",
                  description: "This email address is already registered.",
                  variant: "destructive",
                  duration: 3000,
                });
                setIsLoading(false);
                return;
              }
            } catch (e) {
              // Ignore parse errors for potentially non-user profile items
            }
          }
        }
      }
      
      const userProfileKeyForUsnCheck = `apsconnect_user_${fullUsn}`;
      if (localStorage.getItem(userProfileKeyForUsnCheck)) {
        toast({
          title: "Registration Failed",
          description: "This USN is already registered. Please contact your faculty.",
          variant: "destructive",
          duration: 5000, // Longer duration for important message
        });
        setIsLoading(false);
        return;
      }
    }


    try {
      console.log("Simulating registration with:", { ...data, usn: fullUsn });
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (typeof window !== 'undefined') {
        const userProfileData: UserProfile = {
            uid: fullUsn, // UID for students is their USN
            displayName: data.displayName,
            email: data.email.toLowerCase(),
            role: 'pending',
            usn: fullUsn,
            branch: data.branch,
            semester: data.semester,
            pronouns: data.pronouns || undefined,
            registrationDate: new Date().toISOString(),
            isApproved: false,
            password: data.password, // Store password (mock only)
        };
        localStorage.setItem(`apsconnect_user_${fullUsn}`, JSON.stringify(userProfileData));

        // Also update mockUser if it exists or create it for immediate login effect
        localStorage.setItem('mockUser', JSON.stringify({
            uid: fullUsn,
            displayName: data.displayName,
            email: data.email.toLowerCase(),
            role: 'pending', // Set role to pending initially
            usn: fullUsn,
            branch: data.branch,
            semester: data.semester,
            pronouns: data.pronouns || undefined,
        }));
      }

      toast({
        title: "Registration Submitted",
        description: "Your registration is pending admin/faculty approval. You will be notified once approved.",
        duration: 3000,
      });
      router.push("/dashboard"); // Redirect to dashboard, which will handle routing based on role
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] sm:min-h-[calc(100vh-10rem)] items-center justify-center py-8 sm:py-12 px-4">
      <Card className="w-full max-w-sm sm:max-w-lg shadow-xl">
        <CardHeader className="text-center items-center">
            <Icons.AppLogo className="h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">Create an Account</CardTitle>
          <ShadCnCardDescription className="text-base">Join APSConnect to stay updated with college activities.</ShadCnCardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Thanush Gowda P" {...field} className="text-sm sm:text-base" suppressHydrationWarning/>
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm"/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} className="text-sm sm:text-base" suppressHydrationWarning/>
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm"/>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="usnSuffix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">University Seat Number (USN)</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-medium p-2.5 border border-input rounded-md bg-muted">1AP</span>
                      <FormControl>
                        <Input
                          placeholder="e.g., 23CS001"
                          {...field}
                          className="text-sm sm:text-base"
                          maxLength={7}
                          onInput={(e) => {
                            const inputVal = e.currentTarget.value;
                            // Automatically convert branch part to uppercase dynamically
                            if (inputVal.length >= 2 && inputVal.length <=4) { // YYBB
                                const yearPart = inputVal.substring(0,2);
                                const branchPart = inputVal.substring(2,4);
                                const rollPart = inputVal.substring(4);
                                e.currentTarget.value = yearPart + branchPart.toUpperCase() + rollPart;
                            } else if (inputVal.length > 4) { // YYBBBNNN
                                const yearPart = inputVal.substring(0,2);
                                const branchPart = inputVal.substring(2,4).toUpperCase(); // Ensure branch is uppercase
                                const rollPart = inputVal.substring(4);
                                e.currentTarget.value = yearPart + branchPart + rollPart;
                            }
                            field.onChange(e); // Propagate change to RHF
                          }}
                          suppressHydrationWarning
                        />
                      </FormControl>
                    </div>
                    <ShadCnFormDescription className="text-xs sm:text-sm">
                      e.g., 23CS001
                    </ShadCnFormDescription>
                    <FormMessage className="text-xs sm:text-sm"/>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="branch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Branch</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} >
                        <FormControl>
                          <SelectTrigger className="text-sm sm:text-base" suppressHydrationWarning>
                            <SelectValue placeholder="Select your branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableBranches.length > 0 ? (
                            availableBranches.map((branchName) => (
                              <SelectItem key={branchName} value={branchName} className="text-sm sm:text-base">
                                {branchName}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="disabled" disabled className="text-sm sm:text-base">
                              No branches configured by admin.
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs sm:text-sm"/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Semester</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm sm:text-base" suppressHydrationWarning>
                            <SelectValue placeholder="Select semester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {semesters.map((sem) => (
                            <SelectItem key={sem} value={sem} className="text-sm sm:text-base">
                              {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs sm:text-sm"/>
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                control={form.control}
                name="pronouns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Pronouns (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., she/her, he/him, they/them" {...field} className="text-sm sm:text-base" suppressHydrationWarning/>
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm"/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="text-sm sm:text-base" suppressHydrationWarning/>
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm"/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="text-sm sm:text-base" suppressHydrationWarning/>
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm"/>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-sm sm:text-base" disabled={isLoading} suppressHydrationWarning>
                {isLoading ? "Registering..." : "Register"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
