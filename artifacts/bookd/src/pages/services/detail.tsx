import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { PageTransition } from "@/components/layout/page-transition";
import { 
  useGetService, 
  getGetServiceQueryKey,
  useGetServiceAvailability,
  useListServiceReviews,
  useCreateBooking,
  getGetServiceAvailabilityQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Clock, Star, Info, ChevronLeft } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export function ServiceDetailPage() {
  const [, params] = useRoute("/services/:id");
  const id = params?.id || "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const { data: service, isLoading: isServiceLoading } = useGetService(id, {
    query: { enabled: !!id, queryKey: getGetServiceQueryKey(id) }
  });

  const { data: availabilityData, isLoading: isAvailabilityLoading } = useGetServiceAvailability(
    { serviceId: id, date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined },
    { query: { enabled: !!id && !!selectedDate, queryKey: [id, selectedDate] } }
  );

  const { data: reviewsData, isLoading: isReviewsLoading } = useListServiceReviews(
    { serviceId: id, size: 5 },
    { query: { enabled: !!id } }
  );

  const createBooking = useCreateBooking();

  const handleBookSlot = () => {
    if (!user) {
      toast.error("Please log in to book this service");
      setLocation("/login");
      return;
    }
    
    if (user.role === "PROVIDER") {
      toast.error("Providers cannot book services");
      return;
    }

    if (!selectedSlotId) return;

    createBooking.mutate({
      data: {
        serviceListingId: id,
        availabilityId: selectedSlotId,
        notes: bookingNotes
      }
    }, {
      onSuccess: () => {
        toast.success("Booking confirmed!");
        setIsBookingModalOpen(false);
        queryClient.invalidateQueries({ queryKey: [id, selectedDate] });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to create booking");
      }
    });
  };

  if (isServiceLoading) {
    return (
      <PageTransition className="flex-1 bg-muted/10 p-4 md:p-8">
        <div className="container mx-auto max-w-6xl space-y-8">
          <Skeleton className="h-[40vh] w-full rounded-2xl" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="md:col-span-1">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!service) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState title="Service not found" description="The service you are looking for does not exist." />
      </div>
    );
  }

  const availableSlots = availabilityData?.filter(slot => !slot.isBooked) || [];

  return (
    <PageTransition className="flex-1 bg-background pb-16">
      {/* Hero Image */}
      <div className="relative w-full h-[40vh] min-h-[300px] max-h-[500px] bg-muted overflow-hidden">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary to-accent/80 flex items-center justify-center">
            <span className="text-4xl font-heading font-bold text-white opacity-50">{service.category}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"></div>
        <div className="absolute bottom-6 left-0 right-0 container mx-auto px-4 max-w-6xl flex items-center">
          <Button variant="outline" size="icon" className="rounded-full mr-4 bg-background/50 backdrop-blur" onClick={() => window.history.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Badge className="bg-accent text-white">{service.category}</Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl mt-8">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="md:col-span-2 space-y-10">
            {/* Header */}
            <div>
              <h1 className="text-3xl md:text-5xl font-bold font-heading mb-4 leading-tight">{service.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                <div className="flex items-center text-amber-500 font-medium">
                  <Star className="w-5 h-5 mr-1 fill-current" />
                  {service.averageRating ? service.averageRating.toFixed(1) : "New"} 
                  <span className="text-muted-foreground ml-1 font-normal">({service.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {service.location}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {service.durationMinutes} minutes
                </div>
              </div>
            </div>

            {/* Provider Info */}
            <Card className="border-none shadow-none bg-muted/30">
              <CardContent className="p-6 flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
                  <AvatarImage src={service.provider.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">{service.provider.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">Offered by {service.provider.name}</h3>
                  <p className="text-muted-foreground text-sm flex items-center mt-1">
                    <Star className="w-3 h-3 text-amber-500 fill-current mr-1" /> Verified Provider
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-heading">About this service</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {service.description}
              </p>
            </div>

            {/* Reviews Section */}
            <div className="space-y-6 pt-8 border-t">
              <h2 className="text-2xl font-bold font-heading">Reviews</h2>
              {isReviewsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : reviewsData?.reviews.length === 0 ? (
                <p className="text-muted-foreground italic">No reviews yet for this service.</p>
              ) : (
                <div className="space-y-6">
                  {reviewsData?.reviews.map((review) => (
                    <div key={review.id} className="pb-6 border-b last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{review.customer.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{review.customer.name}</span>
                        </div>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? "text-amber-500 fill-current" : "text-muted"}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm mt-2">{review.comment}</p>
                      <span className="text-xs text-muted-foreground/60 mt-2 block">
                        {format(new Date(review.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Booking Widget */}
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="border-accent/20 shadow-lg border-t-4 border-t-accent">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-bold">${service.price}</CardTitle>
                      <CardDescription>per {service.durationMinutes} min session</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center">
                      Select Date
                    </h4>
                    <div className="border rounded-md p-2 flex justify-center bg-card">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="pointer-events-auto"
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      />
                    </div>
                  </div>

                  {selectedDate && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">
                        Available Times for {format(selectedDate, "MMM d")}
                      </h4>
                      
                      {isAvailabilityLoading ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="bg-muted p-4 rounded-md text-sm text-center text-muted-foreground">
                          No available slots for this date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                          {availableSlots.map((slot) => {
                            const isSelected = selectedSlotId === slot.id;
                            return (
                              <Button
                                key={slot.id}
                                variant={isSelected ? "default" : "outline"}
                                className={`w-full ${isSelected ? "bg-accent hover:bg-accent/90" : ""}`}
                                onClick={() => setSelectedSlotId(slot.id)}
                              >
                                {slot.startTime.substring(0, 5)}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full h-12 text-lg mt-4 bg-primary hover:bg-primary/90" 
                        disabled={!selectedSlotId}
                      >
                        Book This Slot
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Booking</DialogTitle>
                        <DialogDescription>
                          You are about to book {service.title} with {service.provider.name}.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 my-4">
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-medium">
                              {availableSlots.find(s => s.id === selectedSlotId)?.startTime.substring(0, 5)} - 
                              {availableSlots.find(s => s.id === selectedSlotId)?.endTime.substring(0, 5)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="text-muted-foreground">Total Price:</span>
                            <span className="font-bold text-base">${service.price}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Add a note (optional)</label>
                          <Textarea 
                            placeholder="Any special requests or information for the provider?"
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleBookSlot} disabled={createBooking.isPending}>
                          {createBooking.isPending ? "Confirming..." : "Confirm Booking"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-none">
                <CardContent className="p-4 flex gap-3 text-sm text-muted-foreground">
                  <Info className="w-5 h-5 shrink-0 text-accent" />
                  <p>You won't be charged until the provider accepts your booking request. Cancellations are free up to 24 hours before the service.</p>
                </CardContent>
              </Card>
            </div>
          </div>
          
        </div>
      </div>
    </PageTransition>
  );
}
