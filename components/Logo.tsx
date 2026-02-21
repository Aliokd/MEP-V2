"use client";

import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = "", size = 'md' }: LogoProps) {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl'
    };

    return (
        <div className={`flex items-center font-serif italic tracking-tighter cursor-pointer ${sizeClasses[size]} ${className}`}>
            <span className="text-gold-500">Vei</span>
            <span className="text-white/50">note</span>
        </div>
    );
}
