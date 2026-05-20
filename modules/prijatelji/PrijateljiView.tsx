"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddFriendDialog } from "./AddFriendDialog";
import { FriendsList } from "./FriendsList";
import { PendingRequests } from "./PendingRequests";
import { UsernameSetup } from "./UsernameSetup";

export function PrijateljiView() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Prijatelji"
        kicker="Takmičenje"
        description="Dodaj prijatelje da uporedite striktove unosa i bodove preciznosti."
      />

      <UsernameSetup />

      <Card>
        <CardHeader>
          <CardTitle>Dodaj prijatelja</CardTitle>
          <CardDescription>
            Pretraži po korisničkom imenu i pošalji zahtjev.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddFriendDialog />
        </CardContent>
      </Card>

      <PendingRequests />

      <Card>
        <CardHeader>
          <CardTitle>Moji prijatelji</CardTitle>
        </CardHeader>
        <CardContent>
          <FriendsList />
        </CardContent>
      </Card>
    </div>
  );
}
