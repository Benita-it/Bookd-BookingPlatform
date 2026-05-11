import { useState } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
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
import { PageTransition } from "@/components/layout/page-transition";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const loginMutation = useLogin();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setAuth(data.user, data.token, data.refreshToken);
          toast.success("Welcome back!");
          setLocation(data.user.role === "PROVIDER" ? "/provider/dashboard" : "/dashboard");
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to log in");
          setIsLoading(false);
        },
      }
    );
  }

  return (
    <PageTransition className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border shadow-sm">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground font-heading">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
            <div className="space-y-4">
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
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-accent hover:text-accent/80 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
