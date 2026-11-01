import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import './css/styles.css'

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="H1 text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="text-muted-foreground mt-1 text-gray-600">
            Meow! It looks like you found a page that doesn&apos;t exist. Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
