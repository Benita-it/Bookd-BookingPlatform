import { useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { 
  useListMyBookings,
  useCancelBooking,
  useCreateReview,
  BookingStatus
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, CheckCircle, Wallet, Star, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export function CustomerDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Modals state
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewServiceId, setReviewServiceId] = useState<string | null>(null);
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: bookingsData, isLoading } = useListMyBookings();
  const cancelBooking = useCancelBooking();
  const createReview = useCreateReview();

  const handleCancel = () => {
    if (!cancelBookingId) return;
    cancelBooking.mutate({ id: cancelBookingId }, {
      onSuccess: () => {
        toast.success("Booking cancelled");
        setCancelBookingId(null);
        queryClient.invalidateQueries({ queryKey: ["/api/bookings/me"] });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to cancel booking");
      }
    });
  };

  const handleReview = () => {
    if (!reviewBookingId || !reviewServiceId) return;
    createReview.mutate({
      data: {
        bookingId: reviewBookingId,
        rating,
        comment
      }
    }, {
      onSuccess: () => {
        toast.success("Review submitted! Thank you.");
        setReviewBookingId(null);
        queryClient.invalidateQueries({ queryKey: ["/api/bookings/me"] });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to submit review");
      }
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

  // Filter bookings client-side for tabs
  const bookings = bookingsData?.bookings || [];
  const upcomingBookings = bookings.filter(b => b.status === "PENDING" || b.status === "CONFIRMED");
  const pastBookings = bookings.filter(b => b.status === "COMPLETED");
  const cancelledBookings = bookings.filter(b => b.status === "CANCELLED");

  // Stats
  const totalSpent = pastBookings.reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <PageTransition className="flex-1 bg-muted/10 p-4 md:p-8">
      <div className="container mx-auto max-w-6xl space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Manage your appointments and bookings.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
              <CalendarClock className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastBookings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
              <Wallet className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Tabs */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <Tabs defaultValue="upcoming" className="w-full" onValueChange={setActiveTab}>
              <div className="px-6 pt-6 pb-2 border-b">
                <TabsList className="grid w-[400px] grid-cols-3">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                  </div>
                ) : (
                  <>
                    <TabsContent value="upcoming" className="mt-0 space-y-4">
                      {upcomingBookings.length === 0 ? (
                        <EmptyState title="No upcoming bookings" description="You don't have any upcoming appointments right now." />
                      ) : (
                        upcomingBookings.map(booking => (
                          <BookingCard 
                            key={booking.id} 
                            booking={booking} 
                            badge={getStatusBadge(booking.status)}
                            onCancel={() => setCancelBookingId(booking.id)}
                          />
                        ))
                      )}
                    </TabsContent>
                    
                    <TabsContent value="past" className="mt-0 space-y-4">
                      {pastBookings.length === 0 ? (
                        <EmptyState title="No past bookings" description="You haven't completed any appointments yet." />
                      ) : (
                        pastBookings.map(booking => (
                          <BookingCard 
                            key={booking.id} 
                            booking={booking} 
                            badge={getStatusBadge(booking.status)}
                            onReview={!booking.hasReview ? () => {
                              setReviewBookingId(booking.id);
                              setReviewServiceId(booking.service.id);
                            } : undefined}
                          />
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="cancelled" className="mt-0 space-y-4">
                      {cancelledBookings.length === 0 ? (
                        <EmptyState title="No cancelled bookings" description="You don't have any cancelled appointments." />
                      ) : (
                        cancelledBookings.map(booking => (
                          <BookingCard 
                            key={booking.id} 
                            booking={booking} 
                            badge={getStatusBadge(booking.status)}
                          />
                        ))
                      )}
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>

      </div>

      {/* Cancel Modal */}
      <Dialog open={!!cancelBookingId} onOpenChange={(open) => !open && setCancelBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCancelBookingId(null)}>Keep Booking</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelBooking.isPending}>
              {cancelBooking.isPending ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={!!reviewBookingId} onOpenChange={(open) => {
        if (!open) {
          setReviewBookingId(null);
          setRating(5);
          setComment("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              Share your experience to help others find great providers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 my-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Rating</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star className={`w-8 h-8 ${star <= rating ? "text-amber-500 fill-current" : "text-muted"}`} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Comments</label>
              <Textarea 
                placeholder="What did you like about this service?" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewBookingId(null)}>Cancel</Button>
            <Button onClick={handleReview} disabled={createReview.isPending}>
              {createReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageTransition>
  );
}

function BookingCard({ booking, badge, onCancel, onReview }: any) {
  const slotDate = new Date(booking.availability.slotDate);
  
  return (
    <Card className="overflow-hidden group">
      <div className="flex flex-col sm:flex-row">
        {/* Image Thumbnail */}
        <div className="w-full sm:w-32 md:w-48 h-32 sm:h-auto bg-muted shrink-0 relative">
          {booking.service.imageUrl ? (
            <img src={booking.service.imageUrl} alt={booking.service.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary/30">
              <span className="font-heading font-bold">{booking.service.category.substring(0,3)}</span>
            </div>
          )}
          <div className="absolute top-2 left-2 sm:hidden">{badge}</div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="space-y-1 w-full">
            <div className="flex justify-between items-start w-full">
              <h3 className="font-bold font-heading text-lg leading-tight">{booking.service.title}</h3>
              <div className="hidden sm:block shrink-0 ml-4">{badge}</div>
            </div>
            
            <p className="text-sm text-muted-foreground">with {booking.service.provider.name}</p>
            
            <div className="flex items-center text-sm font-medium text-foreground mt-2 bg-muted/30 w-fit px-2 py-1 rounded">
              <CalendarClock className="w-4 h-4 mr-2 text-accent" />
              {format(slotDate, "EEE, MMM d, yyyy")} • {booking.availability.startTime.substring(0,5)} - {booking.availability.endTime.substring(0,5)}
            </div>
          </div>
          
          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0">
            <div className="font-bold text-lg">${booking.totalPrice}</div>
            <div className="flex gap-2">
              {onCancel && (
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              {onReview && (
                <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent/10" onClick={onReview}>
                  Leave Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
