"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SVGSpinnerProps extends React.SVGAttributes<SVGSVGElement> {}

export const DefaultSpinner: React.FC<SVGSpinnerProps> = ({ className, ...props }) => (
  <svg className={cn("h-5 w-5 animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const EllipsisSpinner: React.FC<SVGSpinnerProps> = ({ className, ...props }) => (
  <svg className={cn("h-6 w-6 animate-pulse", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

export const SimpleRotatingSpinner: React.FC<SVGSpinnerProps> = ({ className, ...props }) => (
  <svg className={cn("h-6 w-6 animate-spin", className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" {...props}>
    <circle cx="50" cy="50" fill="none" stroke="currentColor" strokeWidth="10" r="35" strokeDasharray="164.93361431346415 56.97787143782138">
      {/* Removed animateTransform as Tailwind animate-spin handles rotation */}
    </circle>
  </svg>
);


export const ReloaderSpinner: React.FC<SVGSpinnerProps> = ({ className, ...props }) => (
  <svg className={cn("h-8 w-8 animate-spin", className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" {...props}>
    <g>
      <path d="M50 15A35 35 0 1 0 74.74873734152916 25.251262658470843" fill="none" stroke="currentColor" strokeWidth="12"></path>
      <path d="M49 3L49 27L61 15L49 3" fill="currentColor"></path>
      {/* Removed animateTransform as Tailwind animate-spin handles rotation */}
    </g>
  </svg>
);

export const IntercomSpinner: React.FC<SVGSpinnerProps> = ({ className, ...props }) => (
  <svg className={cn("h-6 w-6", className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" {...props}>
    <rect x="10" y="0" width="12" fill="currentColor">
      <animate attributeName="height" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0; 0.15; 1" values="20;100;20;" keySplines="0 0.5 0.5 1;0 0.5 0.25 1" begin="-0.2s"></animate>
    </rect>
    <rect x="45" y="0" width="12" fill="currentColor">
      <animate attributeName="height" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0; 0.15; 1" values="20;100;20;" keySplines="0 0.5 0.5 1;0 0.5 0.25 1" begin="-0.1s"></animate>
    </rect>
    <rect x="80" y="0" width="12" fill="currentColor">
      <animate attributeName="height" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0; 0.15; 1" values="20;100;20;" keySplines="0 0.5 0.5 1;0 0.5 0.25 1"></animate>
    </rect>
  </svg>
);

export const SpinnerWithDot: React.FC<SVGSpinnerProps> = ({ className, ...props }) => (
  <svg className={cn("w-8 h-8 animate-spin", className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" {...props}>
    <g transform="translate(50,50)">
      <g transform="scale(0.7)">
        <circle cx="0" cy="0" r="50" fill="currentColor"></circle>
        {/* For the inner dot, using a CSS variable for background or a contrasting color is better for themes */}
        <circle cx="0" cy="-28" r="15" fill="var(--background)"> 
           {/* Removed animateTransform as Tailwind animate-spin handles rotation for the parent SVG */}
        </circle>
      </g>
    </g>
  </svg>
);


export const SquidGameLoader: React.FC<SVGSpinnerProps> = ({ className, ...props }) => {
    return (
      <div 
        className={cn("relative w-11 h-11", className)}
        style={{
          // @ts-ignore
          '--path': '#2F3545',
          '--dot': '#5928ee',
          '--duration': '3s',
        }}
        {...props}
      >
        <div 
          className="w-[6px] h-[6px] rounded-full absolute block bg-[var(--dot)] top-[37px] left-[19px] animate-dotRect"
          style={{ transform: 'translate(-18px, -18px)' }}
        ></div>
        <svg viewBox="0 0 80 80" className="block w-full h-full">
          <circle 
            id="test" 
            cx="40" 
            cy="40" 
            r="32"
            className="fill-none stroke-[var(--path)]"
            strokeWidth="10"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              strokeDasharray: '150 50 150 50',
              strokeDashoffset: 75,
              animation: 'pathCircle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite'
            }}
          ></circle>
        </svg>
      </div>
    );
};
