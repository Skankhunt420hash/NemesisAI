import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Settings as SettingsIcon,
  Bell,
  Moon,
  Volume2,
  Shield,
  CreditCard,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="min-h-screen obsidian-bg pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="forge-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-violet-400" />
                Notifications
              </CardTitle>
              <CardDescription>Control how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="flex-1">
                  Push Notifications
                  <p className="text-xs text-muted-foreground mt-1">
                    Get notified when your apps are ready
                  </p>
                </Label>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  data-testid="switch-notifications"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="forge-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Volume2 className="w-5 h-5 text-violet-400" />
                Sound & Display
              </CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="flex-1">
                  Sound Effects
                  <p className="text-xs text-muted-foreground mt-1">
                    Play sounds for actions and notifications
                  </p>
                </Label>
                <Switch
                  id="sound"
                  checked={soundEffects}
                  onCheckedChange={setSoundEffects}
                  data-testid="switch-sound"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode" className="flex-1">
                  Dark Mode
                  <p className="text-xs text-muted-foreground mt-1">
                    Use dark theme (recommended for NemesisAI)
                  </p>
                </Label>
                <Switch
                  id="darkMode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  data-testid="switch-dark-mode"
                />
              </div>
            </CardContent>
          </Card>

          {user?.isPro && (
            <Card className="forge-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-violet-400" />
                  Subscription
                </CardTitle>
                <CardDescription>Manage your Pro subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">NemesisAI Pro</p>
                    <p className="text-sm text-muted-foreground">$19/month</p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-manage-subscription">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="forge-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-violet-400" />
                Privacy & Security
              </CardTitle>
              <CardDescription>Your data and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start" data-testid="button-change-password">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive" data-testid="button-delete-account">
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
