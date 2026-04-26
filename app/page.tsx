import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Zap, Shield, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 container mx-auto px-4">
          <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-muted/50">
              <span className="text-primary mr-2">New</span> WhatsApp API Gateway with Baileys
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              Scale Your Business with <span className="text-primary">WhatsApp Automation</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Send broadcasts, automate notifications, and integrate WhatsApp into your apps seamlessly with our premium SaaS platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="h-12 px-8">
                <Link href="/login">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to help you reach your customers where they are.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Zap className="size-10 text-primary" />}
                title="Instant API"
                description="Connect your WhatsApp account in seconds and start sending messages via our REST API."
              />
              <FeatureCard
                icon={<MessageSquare className="size-10 text-primary" />}
                title="Bulk Broadcast"
                description="Send personalized messages to thousands of contacts without getting banned."
              />
              <FeatureCard
                icon={<Shield className="size-10 text-primary" />}
                title="Secure & Reliable"
                description="Enterprise-grade security with Appwrite and Baileys for stable connections."
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground">Choose the plan that fits your business needs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="Lite"
              price="IDR 0"
              description="Perfect for individuals testing out the platform."
              features={["1 Device", "100 Messages/day", "Basic API", "Community Support"]}
            />
            <PricingCard
              title="Pro"
              price="IDR 149k"
              description="For growing businesses needing more power."
              features={["5 Devices", "Unlimited Messages", "Advanced API", "Priority Support", "Webhooks"]}
              featured
            />
            <PricingCard
              title="Enterprise"
              price="Custom"
              description="Dedicated solutions for large organizations."
              features={["Unlimited Devices", "Custom Integrations", "Dedicated Server", "24/7 Account Manager"]}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function PricingCard({ title, price, description, features, featured = false }: { title: string, price: string, description: string, features: string[], featured?: boolean }) {
  return (
    <div className={cn(
      "p-8 rounded-2xl border flex flex-col gap-6",
      featured ? "border-primary shadow-xl scale-105 bg-card relative overflow-hidden" : "bg-card"
    )}>
      {featured && <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold uppercase tracking-wider">Most Popular</div>}
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="text-3xl font-extrabold mt-2">{price}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </div>
      <div className="space-y-3">
        {features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-primary" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      <Button className="w-full mt-auto" variant={featured ? "default" : "outline"} asChild>
        <Link href="/login">Get Started</Link>
      </Button>
    </div>
  )
}
