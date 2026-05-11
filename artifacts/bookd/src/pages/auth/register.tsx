import { useState } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRegister, UserRole } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageTransition } from "@/components/layout/page-transition";
import { toast } from "sonner";
import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([UserRole.CUSTOMER, UserRole.PROVIDER], {
    required_error: "Please select an account type",
  }),
  phone: z.string().optional(),
});

export function RegisterPage() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const registerMutation = useRegister();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: UserRole.CUSTOMER,
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setAuth(data.user, data.token, data.refreshToken);
          toast.success("Account created successfully!");
          setLocation(data.user.role === "PROVIDER" ? "/provider/dashboard" : "/dashboard");
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to create account");
          setIsLoading(false);
        },
      }
    );
  }

  return (
    <PageTransition className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border shadow-sm my-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-heading">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join Bookd to start booking or offering services
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>I want to...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                      disabled={isLoading}
                    >
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value={UserRole.CUSTOMER} className="peer sr-only" />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          <div className={cn(
                            "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent/5 hover:text-accent transition-all",
                            field.value === UserRole.CUSTOMER && "border-accent bg-accent/5 text-accent"
                          )}>
                            <User className="mb-2 h-6 w-6" />
                            <span className="font-semibold text-sm">Book Services</span>
                          </div>
                        </FormLabel>
                      </FormItem>

                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value={UserRole.PROVIDER} className="peer sr-only" />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          <div className={cn(
                            "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent/5 hover:text-accent transition-all",
                            field.value === UserRole.PROVIDER && "border-accent bg-accent/5 text-accent"
                          )}>
                            <Building2 className="mb-2 h-6 w-6" />
                            <span className="font-semibold text-sm">Offer Services</span>
                          </div>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("role") === UserRole.PROVIDER && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Form>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:text-accent/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
