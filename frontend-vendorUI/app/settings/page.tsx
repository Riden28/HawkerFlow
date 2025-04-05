"use client"

import { useState } from "react"
import { Save, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { VendorNavbar } from "@/components/vendor-navbar"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Stall settings
  const [stallName, setStallName] = useState("Tian Hainanese Chicken")
  const [description, setDescription] = useState(
    "Famous for our tender and flavorful Hainanese chicken rice, a local favorite.",
  )
  const [preparationTime, setPreparationTime] = useState("15")
  const [isOpen, setIsOpen] = useState(true)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [email, setEmail] = useState("tian@example.com")
  const [phone, setPhone] = useState("+65 9123 4567")

  const handleSaveSettings = () => {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Settings saved",
        description: "Your stall settings have been updated successfully.",
      })
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorNavbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Stall Settings</h2>
            <p className="text-muted-foreground">Manage your stall information and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Stall Information</CardTitle>
                <CardDescription>Update your stall details and operating preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stall-name">Stall Name</Label>
                  <Input id="stall-name" value={stallName} onChange={(e) => setStallName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="preparation-time">Average Preparation Time (minutes)</Label>
                  <div className="flex items-center">
                    <Input
                      id="preparation-time"
                      value={preparationTime}
                      onChange={(e) => setPreparationTime(e.target.value)}
                      type="number"
                      min="1"
                      className="w-24 mr-2"
                    />
                    <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">This helps customers know how long to wait</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="stall-status">Stall Status</Label>
                    <div className="text-sm text-muted-foreground">Set your stall as open or closed</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="stall-status" checked={isOpen} onCheckedChange={setIsOpen} />
                    <Label htmlFor="stall-status" className="text-sm font-medium">
                      {isOpen ? "Open" : "Closed"}
                    </Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified about new orders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <div className="text-sm text-muted-foreground">Receive order notifications via email</div>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                {emailNotifications && (
                  <div className="space-y-2 ml-6 border-l-2 pl-4 border-muted">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <div className="text-sm text-muted-foreground">Receive order notifications via SMS</div>
                  </div>
                  <Switch id="sms-notifications" checked={smsNotifications} onCheckedChange={setSmsNotifications} />
                </div>

                {smsNotifications && (
                  <div className="space-y-2 ml-6 border-l-2 pl-4 border-muted">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                )}

                <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    SMS notifications may incur additional charges depending on your service provider.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <CardTitle>Menu Management</CardTitle>
                <CardDescription>Manage your menu items, prices, and availability</CardDescription>
              </CardHeader>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Menu management features coming soon!</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account details and security</CardDescription>
              </CardHeader>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Account management features coming soon!</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

