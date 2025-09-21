
"use client";

import { SiteConfig } from "@/config/site";
import Link from "next/link";
import React, { useEffect, useState } from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react';

const SITE_SETTINGS_STORAGE_KEY = 'apsconnect_site_settings_v1';

interface SiteSettingsSocialLinks {
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedIn?: string;
  socialInstagram?: string;
  socialGithub?: string;
}

export function Footer() {
  const [socialLinks, setSocialLinks] = useState<SiteSettingsSocialLinks>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings) as SiteSettingsSocialLinks;
          setSocialLinks(parsed);
        } catch (e) {
          console.error("Failed to parse site settings for footer:", e);
        }
      }
    }
  }, []);

  const socialNavItems = [
    { platform: 'Facebook', href: socialLinks.socialFacebook, icon: Facebook },
    { platform: 'Twitter', href: socialLinks.socialTwitter, icon: Twitter },
    { platform: 'Instagram', href: socialLinks.socialInstagram, icon: Instagram },
    { platform: 'LinkedIn', href: socialLinks.socialLinkedIn, icon: Linkedin },
    { platform: 'Github', href: socialLinks.socialGithub, icon: Github },
  ].filter(item => item.href && item.href.trim() !== '');


  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-20 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} {SiteConfig.name}. All rights reserved.
          </p>
        </div>
        <div className="flex items-center gap-4">
            <nav className="flex gap-4">
            {SiteConfig.footerNav?.map((item) => (
                <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-primary"
                >
                {item.title}
                </Link>
            ))}
            </nav>
            {socialNavItems.length > 0 && (
              <div className="flex gap-3">
                {socialNavItems.map((item) => (
                  <Link
                    key={item.platform}
                    href={item.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.platform}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                ))}
              </div>
            )}
        </div>
      </div>
    </footer>
  );
}
