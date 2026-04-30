"use client"

import HeroSection from "@/components/hero";
import { Button } from "@/components/ui/button";
import {
  featuresData,
  howItWorksData,
  statsData,
  testimonialsData,
} from "@/data/landing";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="mt-40 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">

      {/* Hero */}
      <HeroSection />

      {/* Stats Section */}
      <section className="py-20 bg-blue-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statsData.map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-800 dark:text-blue-400 mb-2">
                  {item.value}
                </div>
                <div className="text-gray-500 dark:text-gray-300 font-bold">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-blue-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">
            Everything You Need to Run Your Financial Life Smarter.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresData.map((feature, index) => (
              <Card
                key={index}
                className="p-6 bg-white dark:bg-gray-800 border dark:border-gray-700"
              >
                <CardContent className="space-y-4 pt-4">
                  {feature.icon}
                  <h3 className="text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-blue-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-16">Get Started in Minutes</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {howItWorksData.map((step, index) => (
              <div key={index}>
                <div className="w-16 h-16 bg-blue-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">
            What Our Users Say
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonialsData.map((testimonial, index) => (
              <Card
                key={index}
                className="p-6 bg-white dark:bg-gray-800 border dark:border-gray-700"
              >
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center mb-4">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div className="ml-4">
                      <div className="font-semibold">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300">
                    {testimonial.quote}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600 dark:bg-blue-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">
            Ready to Take Control of Your Finances
          </h2>

          <p className="text-blue-100 dark:text-blue-200 mb-8 max-w-2xl mx-auto">
            Join thousands of users managing their finances smarter with Wealth
          </p>

          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-700 animate-bounce"
            >
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}