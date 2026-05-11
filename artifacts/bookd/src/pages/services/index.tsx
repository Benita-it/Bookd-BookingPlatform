import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { PageTransition } from "@/components/layout/page-transition";
import { useListServices, ServiceCategory } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, MapPin, Star, Filter, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/use-debounce";

export function ServicesPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [location, setLocationInput] = useState("");
  const debouncedLocation = useDebounce(location, 500);
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const debouncedPriceRange = useDebounce(priceRange, 500);
  
  const [sort, setSort] = useState("-averageRating");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useListServices({
    search: debouncedSearch || undefined,
    location: debouncedLocation || undefined,
    category: selectedCategories.length > 0 ? selectedCategories.join(",") : undefined,
    minPrice: debouncedPriceRange[0] > 0 ? debouncedPriceRange[0] : undefined,
    maxPrice: debouncedPriceRange[1] < 500 ? debouncedPriceRange[1] : undefined,
    sort,
    page,
    size: 12
  });

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedLocation, selectedCategories, debouncedPriceRange, sort]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setLocationInput("");
    setSelectedCategories([]);
    setPriceRange([0, 500]);
    setSort("-averageRating");
  };

  return (
    <PageTransition className="flex-1 bg-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Mobile Filter Toggle */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold font-heading">Services</h1>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Sidebar Filters */}
          <aside className={`w-full md:w-64 lg:w-72 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block space-y-8`}>
            <div className="space-y-6 bg-card p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Filters</h2>
                {(selectedCategories.length > 0 || search || location || priceRange[0] > 0 || priceRange[1] < 500) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground text-xs">
                    Clear all
                  </Button>
                )}
              </div>

              {/* Location */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Location</h3>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="City or zip" 
                    className="pl-9"
                    value={location}
                    onChange={(e) => setLocationInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Categories</h3>
                <div className="space-y-2.5">
                  {Object.values(ServiceCategory).map((cat) => (
                    <div key={cat} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`cat-${cat}`} 
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => toggleCategory(cat)}
                      />
                      <label 
                        htmlFor={`cat-${cat}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                      >
                        {cat.toLowerCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Price Range</h3>
                  <span className="text-xs text-muted-foreground">
                    ${priceRange[0]} - ${priceRange[1]}{priceRange[1] === 500 ? '+' : ''}
                  </span>
                </div>
                <Slider
                  defaultValue={[0, 500]}
                  max={500}
                  step={10}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="py-4"
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-6">
            <div className="hidden md:block">
              <h1 className="text-3xl font-bold font-heading mb-6">Find Services</h1>
            </div>

            {/* Search and Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search for services, providers..." 
                  className="pl-10 h-11 bg-card shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                  {data?.total || 0} results
                </span>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-[180px] h-11 bg-card shadow-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-averageRating">Highest Rated</SelectItem>
                    <SelectItem value="-createdAt">Newest Arrivals</SelectItem>
                    <SelectItem value="price">Price: Low to High</SelectItem>
                    <SelectItem value="-price">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedCategories.length > 0 || search || location) && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground mr-2">Active filters:</span>
                {search && (
                  <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1">
                    Search: {search} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearch("")} />
                  </Badge>
                )}
                {location && (
                  <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1">
                    Location: {location} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setLocationInput("")} />
                  </Badge>
                )}
                {selectedCategories.map(cat => (
                  <Badge key={cat} variant="secondary" className="px-3 py-1 flex items-center gap-1 capitalize bg-accent/10 text-accent hover:bg-accent/20">
                    {cat.toLowerCase()} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => toggleCategory(cat)} />
                  </Badge>
                ))}
              </div>
            )}

            {/* Service Grid */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full rounded-none" />
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-6 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <EmptyState 
                title="Failed to load services" 
                description="There was an error loading the services. Please try again later."
                action={<Button onClick={() => window.location.reload()}>Retry</Button>}
              />
            ) : data?.services.length === 0 ? (
              <EmptyState 
                title="No services found" 
                description="We couldn't find any services matching your current filters. Try adjusting your search criteria."
                action={<Button onClick={clearFilters} variant="outline">Clear all filters</Button>}
              />
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data?.services.map((service) => (
                    <Link key={service.id} href={`/services/${service.id}`}>
                      <Card className="h-full overflow-hidden hover:shadow-md transition-all group cursor-pointer border-border/60 hover:border-accent/50 bg-card flex flex-col">
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative shrink-0">
                          {service.imageUrl ? (
                            <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground opacity-90 group-hover:opacity-100 transition-opacity">
                              <span className="font-heading font-bold text-xl">{service.category}</span>
                            </div>
                          )}
                          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm capitalize">
                            {service.category.toLowerCase()}
                          </Badge>
                        </div>
                        <CardContent className="p-5 flex flex-col flex-1">
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
                              <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                              {service.averageRating ? service.averageRating.toFixed(1) : "New"}
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-bold font-heading leading-tight mb-2 group-hover:text-accent transition-colors line-clamp-2">
                            {service.title}
                          </h3>
                          
                          <div className="mt-auto pt-4 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-semibold text-lg leading-none">${service.price}</span>
                              <span className="text-xs text-muted-foreground mt-1">{service.durationMinutes} min</span>
                            </div>
                            <Button size="sm" variant="secondary" className="group-hover:bg-accent group-hover:text-white transition-colors">
                              Book
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {data?.totalPages && data.totalPages > 1 && (
                  <div className="flex justify-center mt-10 space-x-2">
                    <Button 
                      variant="outline" 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center px-4 font-medium text-sm">
                      Page {page} of {data.totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      disabled={page === data.totalPages}
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </PageTransition>
  );
}
