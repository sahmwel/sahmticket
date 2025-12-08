// src/components/Loader.tsx
import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-full w-full py-10">
      <Loader2 className="animate-spin text-purple-600 w-10 h-10" />
    </div>
  );
}
