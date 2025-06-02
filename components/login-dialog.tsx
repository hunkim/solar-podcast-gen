"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Chrome, Sparkles, Shield, Database } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to sign in:", error)
      // Could add toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Welcome to Solar Podcast Flow
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            Sign in to save your podcast generations and track your progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Features Preview */}
          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Database className="w-4 h-4 text-green-600" />
              <span>Save and track all your podcast generations</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Secure authentication with Google</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Resume interrupted generations</span>
            </div>
          </div>

          {/* Sign In Button */}
          <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Get Started</CardTitle>
              <CardDescription>
                Sign in with your Google account to begin
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-11 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Chrome className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Note */}
          <div className="text-xs text-gray-500 text-center leading-relaxed">
            By signing in, you agree to our terms of service. We'll only access your basic profile information and email address.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
