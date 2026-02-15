"use client"

import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: number | null
}

export function QRCodeModal({ isOpen, onClose, sessionId }: QRCodeModalProps) {
  if (!isOpen || sessionId === null) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Session QR Code</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={String(sessionId)}
              size={256}
              level="M"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Session ID: {sessionId}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Point the kiosk camera at this QR code to begin check-in.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
