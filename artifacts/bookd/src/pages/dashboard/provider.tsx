import { useState } from "react";
import { Link } from "wouter";
import { PageTransition } from "@/components/layout/page-transition";
import { 
  useGetProviderStats,
  useListProviderBookings,
  useListMyServices,
  useCompleteBooking,
  BookingStatus
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign, Star, Package, Plus, CheckCircle, Edit2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";

export function ProviderDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useGetProviderStats();
  const { data: bookingsData, isLoading: bookingsLoading } = useListProviderBookings({ size: 10 });
  const { data: servicesData, isLoading: servicesLoading } = useListMyServices();
  const completeBooking = useCompleteBooking();

  const handleComplete = (id: string) => {
    completeBooking.mutate({ id }, {
      onSuccess: () => {
        toast.success("Booking marked as completed");
        queryClient.invalidateQueries({ queryKey: ["/api/bookings/provider"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/provider"] });
      },
      onError: (err) => toast.error(err.message || "Failed to complete booking")
    });
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch(status) {
      case "PENDING": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case "CONFIRMED": return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>;
      case "COMPLETED": return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case "CANCELLED": return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <PageTransition className="flex-1 bg-muted/10 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Provider Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your business performance.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/provider/availability">
              <Button variant="outline" className="bg-background">
                <Calendar className="w-4 h-4 mr-2" />
                Manage Calendar
              </Button>
            </Link>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" />
              New Service
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">${stats?.totalRevenue.toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bookings This Month</CardTitle>
              <Calendar className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{stats?.bookingsThisMonth}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
              <Star className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{stats?.averageRating ? stats.averageRating.toFixed(1) : "N/A"}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Services</CardTitle>
              <Package className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{stats?.activeServices}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full mt-4">
                {stats?.revenueByWeek && stats.revenueByWeek.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenueByWeek}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`$${value}`, 'Revenue']}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={3} dot={{r: 4, fill: '#0D9488', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Not enough data to display chart
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Recent Bookings */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Bookings</CardTitle>
              <Button variant="ghost" size="sm" className="text-accent">View All</Button>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : bookingsData?.bookings.length === 0 ? (
                <EmptyState title="No bookings yet" description="Your upcoming appointments will appear here." className="min-h-[200px]" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsData?.bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.customer?.name}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{booking.service.title}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(booking.availability.slotDate), "MMM d")}
                              <span className="text-muted-foreground block text-xs">
                                {booking.availability.startTime.substring(0,5)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell className="text-right">
                            {booking.status === "CONFIRMED" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                                onClick={() => handleComplete(booking.id)}
                                disabled={completeBooking.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Complete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manage Services */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Services</CardTitle>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : servicesData?.services.length === 0 ? (
                <EmptyState 
                  title="No services" 
                  description="Create a service to start getting booked." 
                  className="min-h-[200px]"
                  icon={<Package className="w-8 h-8 text-muted-foreground" />}
                />
              ) : (
                <div className="space-y-4">
                  {servicesData?.services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors group">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-medium text-sm truncate">{service.title}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <span className="font-semibold text-foreground mr-2">${service.price}</span>
                          <Clock className="w-3 h-3 mr-1" /> {service.durationMinutes}m
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground group-hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </PageTransition>
  );
}
