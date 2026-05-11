import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full border-t bg-background/50">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <span className="font-heading font-bold text-xl tracking-tighter cursor-pointer flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded border bg-accent text-accent-foreground flex items-center justify-center text-sm">B</span>
                Bookd
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6">
              The premier marketplace for professional services. Book verified experts instantly.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/services">Browse Services</Link></li>
              <li><Link href="/register">Become a Provider</Link></li>
              <li><Link href="/login">Sign In</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Categories</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Health & Wellness</li>
              <li>Beauty & Spa</li>
              <li>Fitness & Training</li>
              <li>Home Services</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Bookd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
