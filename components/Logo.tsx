"use client";

import React from "react";

export default function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer shield structure in white */}
      <path
        d="M50 5 L90 22 V55 C90 82 73 103 50 115 C27 103 10 82 10 55 V22 L50 5 Z"
        stroke="#FFFFFF"
        strokeWidth="8"
        strokeLinejoin="round"
        fill="rgba(255, 255, 255, 0.03)"
      />
      {/* Inner secure connection nodes in white */}
      <path
        d="M50 35 L70 55 L50 75 L30 55 Z"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="35" r="5" fill="#000000" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="70" cy="55" r="5" fill="#000000" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="50" cy="75" r="5" fill="#000000" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="30" cy="55" r="5" fill="#000000" stroke="#FFFFFF" strokeWidth="2" />
      
      {/* Central node in white, keyhole in black */}
      <circle cx="50" cy="55" r="10" fill="#FFFFFF" />
      <path d="M50 55 V68" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
