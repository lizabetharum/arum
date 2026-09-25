"use client";

import { useActionState } from "react";
import { CircleAlertIcon, Loader2Icon } from "lucide-react";
import { acceptInvite, type InviteState } from "@/lib/invite-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(acceptInvite, null);
  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          {/*
            Shown rather than hidden so they can see which address to sign in with
            next time -- and so password managers file the password under the right
            account, which they will not do for a form with no username field.
          */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Your sign-in email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              readOnly
              autoComplete="username"
              className="h-9 bg-muted text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Choose a password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Type it again</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-9"
            />
          </div>
          {state?.error && (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending} className="h-9 w-full">
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {pending ? "Setting up…" : "Set password and sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
