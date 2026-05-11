import { ReactNode } from "react";
import { FolderX } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  action, 
  icon = <FolderX className="w-10 h-10 text-muted-foreground" />,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-xl bg-muted/20 min-h-[300px]", className)}>
      <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-8">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
