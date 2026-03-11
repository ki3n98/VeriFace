"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"

export default function VerifyEmailChangePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setMessage("No verification token found in the link.")
      return
    }

    async function verify() {
      const res = await apiClient.verifyEmailChange(token!)
      if (res.error) {
        setStatus("error")
        setMessage(res.error)
      } else {
        setStatus("success")
        setMessage(res.data?.message ?? "Your email has been updated.")
      }
    }

    verify()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background2">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-xl shadow">
        {status === "loading" && (
          <p className="text-gray-500">Verifying your new email...</p>
        )}
        {status === "success" && (
          <>
            <h1 className="text-xl font-bold text-green-600 mb-2">Email Updated</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="bg-primary text-white px-6 py-2 rounded hover:opacity-90"
            >
              Go to Settings
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-red-500 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="bg-primary text-white px-6 py-2 rounded hover:opacity-90"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  )
}
