"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function SecurityPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDeleteAccount() {
    setStatus("deleting");
    const res = await apiClient.deleteAccount();
    if (res.error) {
      setStatus("error");
      setErrorMsg(res.error);
      return;
    }
    apiClient.logout();
    router.replace("/sign-in");
  }

  return (
    <>
      {/* Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card text-card-foreground rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              <h2 className="font-semibold text-base">Delete Account</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your account and all associated data — including your face
              embedding, achievements, and attendance history. <strong className="text-card-foreground">This cannot be undone.</strong>
            </p>
            {status === "error" && (
              <p className="text-xs text-red-500">{errorMsg}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={status === "deleting"}
                className="flex-1 bg-red-500 text-white text-sm py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                {status === "deleting" ? "Deleting..." : "Yes, delete my account"}
              </button>
              <button
                type="button"
                onClick={() => { setModalOpen(false); setStatus("idle"); setErrorMsg(""); }}
                disabled={status === "deleting"}
                className="flex-1 border border-border text-sm py-2 rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Delete Account</div>
              <div className="text-sm text-gray-500">
                Permanently remove your account and all associated data
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-sm bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Delete Account
            </button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
