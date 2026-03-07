import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Shield } from "lucide-react"

export default function SecurityPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Security</CardTitle>
        </div>
        <CardDescription>Manage your account security settings</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">Security settings coming soon.</p>
      </CardContent>
    </Card>
  )
}
