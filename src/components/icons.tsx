import type { SVGProps } from "react";
import { Building2 } from "lucide-react"; // Example, can be replaced

export const Icons = {
  AppLogo: (props: SVGProps<SVGSVGElement>) => (
    // A simple placeholder logo - replace with a proper one
    <Building2 {...props} />
  ),
  // Re-export other lucide icons if needed for consistency or specific styling
  // Example: Spinner: (props: SVGProps<SVGSVGElement>) => <Loader2 className="animate-spin" {...props} />,
};
