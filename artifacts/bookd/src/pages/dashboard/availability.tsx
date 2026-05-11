import { useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { 
  useListMyServices,
  useCreateAvailability,
  useGetServiceAvailability
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Plus, Trash2, Calendar as CalendarIcon, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function ManageAvailabilityPage() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to?: Date | undefined}>({
    from: new Date(),
    to: addDays(new Date(), 7)
  });
  
  // Default slots
  const [slots, setSlots] = useState([{ startTime: "09:00", endTime: "10:00" }]);

  const { data: servicesData, isLoading: servicesLoading } = useListMyServices();
  const createAvailability = useCreateAvailability();

  // Fetch existing availability for the selected month to show on calendar
  const currentMonthStr = format(dateRange.from || new Date(), "yyyy-MM");
  const { data: existingSlots } = useGetServiceAvailability(
    { serviceId: selectedServiceId }, // Ideally API supports fetching by month, we'll fetch all or mock
    { query: { enabled: !!selectedServiceId } }
  );

  const handleAddSlot = () => {
    setSlots([...slots, { startTime: "12:00", endTime: "13:00" }]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: "startTime" | "endTime", value: string) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const handleSave = () => {
    if (!selectedServiceId) {
      toast.error("Please select a service");
      return;
    }
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select a valid date range");
      return;
    }
    if (slots.length === 0) {
      toast.error("Please add at least one time slot");
      return;
    }

    createAvailability.mutate({
      data: {
        serviceListingId: selectedServiceId,
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        slots: slots
      }
    }, {
      onSuccess: () => {
        toast.success("Availability created successfully");
        queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create availability");
      }
    });
  };

  return (
    <PageTransition className="flex-1 bg-muted/10 p-4 md:p-8">
      <div className="container mx-auto max-w-5xl space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Manage Availability</h1>
          <p className="text-muted-foreground mt-1">Set your working hours for services.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Col: Setup */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Select Service</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger disabled={servicesLoading}>
                    <SelectValue placeholder="Choose a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {servicesData?.services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className={!selectedServiceId ? "opacity-50 pointer-events-none" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">2. Time Slots</CardTitle>
                <CardDescription>Daily slots to generate within the date range.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Input 
                        type="time" 
                        value={slot.startTime} 
                        onChange={(e) => handleSlotChange(i, "startTime", e.target.value)}
                        className="text-sm"
                      />
                      <Input 
                        type="time" 
                        value={slot.endTime} 
                        onChange={(e) => handleSlotChange(i, "endTime", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(i)} className="text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button variant="outline" size="sm" className="w-full mt-2 border-dashed" onClick={handleAddSlot}>
                  <Plus className="w-4 h-4 mr-2" /> Add Slot
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Calendar */}
          <div className="md:col-span-2 space-y-6">
            <Card className={!selectedServiceId ? "opacity-50 pointer-events-none" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">3. Select Date Range</CardTitle>
                <CardDescription>Click to select start date, then click end date.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 bg-background flex justify-center">
                  <Calendar
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(range: any) => setDateRange(range || { from: undefined })}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                </div>

                <div className="mt-8 flex justify-end">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90" 
                    onClick={handleSave}
                    disabled={createAvailability.isPending || !selectedServiceId || !dateRange.from}
                  >
                    {createAvailability.isPending ? "Generating..." : "Generate Availability"}
                    <Save className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
