"use client";

import Link from 'next/link';
import React, { useEffect } from 'react';
import { Button } from './ui/button';
import Image from 'next/image';
import { useRef } from 'react';

const HeroSection = () => {
    const imageRef = useRef();
    useEffect(() => {
        const imageElement = imageRef.current;

        const handleScroll=()=>{
            const scrollPosition = window.scrollY;
            const scrollThreshold = 100;

            if(scrollPosition > scrollThreshold){
                imageElement.classList.add("scrolled");
            }
            else{
                imageElement.classList.remove("scrolled");
            }
        }
        window.addEventListener("scroll",handleScroll)
        return ()=> window.removeEventListener("scroll",handleScroll);
    },[]);
  return (
    <div className="px-4 pb-16 pt-24 sm:pb-20 sm:pt-28">
        <div className='container mx-auto text-center'>
            <h1 className="pb-5 text-4xl leading-tight sm:text-5xl md:text-7xl lg:text-8xl gradient-title">
                Your Finances <br/> Powered by Intelligence
            </h1>
      <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">An AI-powered financial management platform that help you track 
                analyze, and optimize your spending with real-time insights.</p>
        </div>
        <div className='flex justify-center space-x-4'>
            <Link href= "/dashboard">
                <Button size="lg" className="px-8">Get Started</Button>
            </Link>
            <Link href="https://www.youtube.com/roadsidecoder">
                <Button size='lg' variant='outline' className='px-8'>Watch Demo</Button>
            </Link>
        </div>
        <div className='hero-image-wrapper'>
            <div ref={imageRef} className='hero-image'>
                <Image src="/banner.png" 
                width={1280} 
                height={720}
                alt="Dashboard Preview"
                className="rounded-lg shadow-2xl border mx-auto"/>
            </div>
        </div>
    </div>
  )
};

export default HeroSection;