import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { motion } from "framer-motion";
import { useListServices } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Scissors, Dumbbell, GraduationCap, Home, Sparkles, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { name: "HEALTH", icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-500/10" },
  { name: "BEAUTY", icon: Scissors, color: "text-pink-500", bg: "bg-pink-500/10" },
  { name: "FITNESS", icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-500/10" },
  { name: "EDUCATION", icon: GraduationCap, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { name: "HOME", icon: Home, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { name: "OTHER", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function LandingPage() {
  const { data: servicesData, isLoading } = useListServices({ size: 3, sort: "-averageRating" });

  return (
    <PageTransition className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 lg:py-48 overflow-hidden bg-primary text-primary-foreground dark:bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-accent opacity-20 blur-[100px]"></div>
        
        <div className="container px-4 md:px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent backdrop-blur-sm mb-4">
              <span className="flex h-2 w-2 rounded-full bg-accent mr-2"></span>
              The premier booking platform
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter font-heading leading-tight">
              Book anything. <br/><span className="text-accent">Instantly.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/70 dark:text-muted-foreground max-w-2xl mx-auto">
              Find and book vetted professionals across health, beauty, fitness, home services, and more. Your time is valuable—book it right.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/services">
                <Button size="lg" className="h-12 px-8 text-base font-medium w-full sm:w-auto bg-accent hover:bg-accent/90 text-white">
                  Browse Services
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium w-full sm:w-auto border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground dark:border-border dark:text-foreground dark:hover:bg-accent/10 dark:hover:text-accent">
                  Become a Provider
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="w-full py-20 bg-background">
        <div className="container px-4 md:px-6">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">Explore Categories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Find exactly what you need from our extensive list of professional categories.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {CATEGORIES.map((category) => (
              <motion.div key={category.name} variants={itemVariants}>
                <Link href={`/services?category=${category.name}`}>
                  <Card className="group cursor-pointer hover:border-accent transition-colors overflow-hidden h-full">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-full">
                      <div className={`p-4 rounded-full ${category.bg} ${category.color} group-hover:scale-110 transition-transform duration-300`}>
                        <category.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-sm tracking-tight">{category.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="w-full py-20 bg-muted/30 border-y">
        <div className="container px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Three simple steps to get the service you need.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-3 gap-8 relative"
          >
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-[2px] bg-border z-0"></div>

            {[
              { step: "01", title: "Find a Service", desc: "Browse through our curated list of verified professional services." },
              { step: "02", title: "Pick a Time", desc: "Select a date and time that works perfectly with your schedule." },
              { step: "03", title: "Book Instantly", desc: "Confirm your booking and manage it directly from your dashboard." }
            ].map((item, i) => (
              <motion.div key={i} variants={itemVariants} className="relative z-10 flex flex-col items-center text-center space-y-4 bg-background p-6 rounded-2xl border shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg font-heading shadow-md">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold font-heading">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Providers */}
      <section className="w-full py-20 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-4 md:space-y-0">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">Top Rated Services</h2>
              <p className="text-muted-foreground max-w-2xl">Book with our highest rated professionals.</p>
            </div>
            <Link href="/services">
              <Button variant="outline">View All Services</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="w-full h-48 rounded-xl" />
                  <Skeleton className="w-2/3 h-6" />
                  <Skeleton className="w-1/2 h-4" />
                </div>
              ))}
            </div>
          ) : servicesData?.services && servicesData.services.length > 0 ? (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {servicesData.services.map((service) => (
                <motion.div key={service.id} variants={itemVariants}>
                  <Link href={`/services/${service.id}`}>
                    <Card className="h-full overflow-hidden hover:shadow-md transition-all group cursor-pointer border-border/50 hover:border-accent/50">
                      <div className="aspect-video w-full overflow-hidden bg-muted relative">
                        {service.imageUrl ? (
                          <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground opacity-80 group-hover:opacity-100 transition-opacity">
                            <span className="font-heading font-bold text-2xl">{service.category}</span>
                          </div>
                        )}
                        <Badge className="absolute top-3 right-3 bg-background/90 text-foreground backdrop-blur-sm border-none hover:bg-background/90">
                          {service.category}
                        </Badge>
                      </div>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6 border">
                              <AvatarImage src={service.provider.avatarUrl || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {service.provider.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-muted-foreground truncate max-w-[120px]">
                              {service.provider.name}
                            </span>
                          </div>
                          <div className="flex items-center text-amber-500 text-sm font-medium">
                            <Star className="w-4 h-4 mr-1 fill-current" />
                            {service.averageRating ? service.averageRating.toFixed(1) : "New"}
                          </div>
                        </div>
                        <h3 className="text-lg font-bold font-heading leading-tight mb-2 group-hover:text-accent transition-colors line-clamp-1">
                          {service.title}
                        </h3>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                          <span className="font-semibold text-lg">${service.price}</span>
                          <span className="text-sm text-muted-foreground">{service.durationMinutes} min</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No services found.
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 bg-accent text-accent-foreground text-center px-4">
        <div className="container max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold font-heading">Ready to get started?</h2>
          <p className="text-xl text-accent-foreground/80">
            Join thousands of professionals and customers already using Bookd.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold text-accent hover:text-accent/90">
              Create an Account Now
            </Button>
          </Link>
        </div>
      </section>
    </PageTransition>
  );
}
