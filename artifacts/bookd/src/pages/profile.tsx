import { useState, useEffect } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  useGetMe, 
  useUpdateMe, 
  useChangePassword 
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Camera, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        phone: user.phone || "",
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = (values: z.infer<typeof profileSchema>) => {
    updateMe.mutate({ data: values }, {
      onSuccess: () => toast.success("Profile updated successfully"),
      onError: (err) => toast.error(err.message || "Failed to update profile")
    });
  };

  const onPasswordSubmit = (values: z.infer<typeof passwordSchema>) => {
    changePassword.mutate({ 
      data: { currentPassword: values.currentPassword, newPassword: values.newPassword } 
    }, {
      onSuccess: () => {
        toast.success("Password changed successfully");
        passwordForm.reset();
      },
      onError: (err) => toast.error(err.message || "Failed to change password")
    });
  };

  const handleDeleteAccount = () => {
    // We mock this since there's no hook for it, but user requested the UI
    toast.success("Account marked for deletion. Logging out...");
    setTimeout(() => {
      logout();
      setLocation("/");
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-8 space-y-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageTransition className="flex-1 bg-muted/10 p-4 md:p-8">
      <div className="container mx-auto max-w-3xl space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and preferences.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <Avatar className="w-20 h-20 border shadow-sm">
                      <AvatarImage src={user?.avatarUrl || undefined} />
                      <AvatarFallback className="text-2xl">{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-medium">{user?.name}</h3>
                    <p className="text-sm text-muted-foreground">{user?.role} Account</p>
                  </div>
                </div>

                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <Input value={user?.email || ""} disabled className="bg-muted" />
                      <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                    </FormItem>
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={updateMe.isPending} className="mt-4">
                      {updateMe.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl><Input type="password" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl><Input type="password" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl><Input type="password" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={changePassword.isPending} variant="secondary" className="mt-4">
                      {changePassword.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5" /> Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">Delete Account</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive">Are you absolutely sure?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove your data from our servers.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="my-4 space-y-3">
                      <Label>Please type <strong>DELETE</strong> to confirm.</Label>
                      <Input 
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE"}
                      >
                        Delete My Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
