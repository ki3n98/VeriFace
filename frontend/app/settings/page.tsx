"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { User, Palette, Upload, ScanFace } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/themeToggle";

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}

export default function UserSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  // Crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Name edit state
  const [nameEditMode, setNameEditMode] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "error">("idle");
  const [nameError, setNameError] = useState("");

  // Face reset state
  const [faceResetStatus, setFaceResetStatus] = useState<"idle" | "resetting" | "error">("idle");

  // Email edit state
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailStatusMsg, setEmailStatusMsg] = useState("");

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiClient.getCurrentUser();
        const userData = response.data?.data;
        if (userData) {
          setUser(userData);
          if (userData.avatar_url) {
            const urlRes = await apiClient.getAvatarUrl();
            setAvatarSignedUrl(urlRes.data?.signed_url ?? null);
          }
        } else {
          router.push("/sign-in");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/sign-in");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  // --- Avatar / crop ---

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropModalOpen(true);
    e.target.value = "";
  }

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => {
      image.onload = resolve;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 400, 400);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Canvas is empty")); return; }
        resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.9);
    });
  }

  async function handleCropConfirm() {
    if (!imageToCrop || !croppedAreaPixels) return;
    setUploading(true);
    setCropModalOpen(false);
    try {
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const res = await apiClient.uploadAvatar(croppedFile);
      if (res.error) {
        alert(res.error);
      } else if (res.data?.signed_url) {
        setAvatarSignedUrl(res.data.signed_url);
      }
    } catch (error) {
      console.error("Avatar upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
  }

  // --- Name edit ---

  function openNameEdit() {
    setNewFirstName(user?.first_name ?? "");
    setNewLastName(user?.last_name ?? "");
    setNameStatus("idle");
    setNameError("");
    setNameEditMode(true);
  }

  async function handleSaveName() {
    if (!newFirstName.trim() || !newLastName.trim()) {
      setNameError("First and last name cannot be empty.");
      return;
    }
    setNameStatus("saving");
    const res = await apiClient.updateProfile(newFirstName.trim(), newLastName.trim());
    if (res.error) {
      setNameStatus("error");
      setNameError(res.error);
    } else if (res.data) {
      // Update local user state with the confirmed values from the server
      setUser((prev) => prev ? { ...prev, first_name: res.data!.first_name, last_name: res.data!.last_name } : prev);
      setNameEditMode(false);
      setNameStatus("idle");
    }
  }

  // --- Email change ---

  async function handleRequestEmailChange() {
    if (!newEmail) return;
    setEmailStatus("sending");
    const res = await apiClient.requestEmailChange(newEmail);
    if (res.error) {
      setEmailStatus("error");
      setEmailStatusMsg(res.error);
    } else {
      setEmailStatus("sent");
      setEmailStatusMsg(res.data?.message ?? "Verification email sent. Check your inbox.");
      setNewEmail("");
    }
  }

  // --- Face reset ---

  async function handleResetFace() {
    setFaceResetStatus("resetting");
    const res = await apiClient.resetEmbedding();
    if (res.error) {
      setFaceResetStatus("error");
    } else {
      router.push("/picture");
    }
  }

  // --- Helpers ---

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const formatUserId = (id: number) => {
    return `${String(id).padStart(6, "0")}`;
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <>
      {/* Crop Modal */}
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-semibold text-sm">Crop your photo</h2>
              <p className="text-xs text-gray-500">Drag to reposition, scroll to zoom</p>
            </div>
            <div className="relative h-80 bg-gray-900">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex gap-2 p-4">
              <button
                type="button"
                onClick={handleCropConfirm}
                className="flex-1 bg-primary text-white text-sm py-2 rounded hover:opacity-90"
              >
                Crop &amp; Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setCropModalOpen(false);
                  URL.revokeObjectURL(imageToCrop);
                  setImageToCrop(null);
                }}
                className="flex-1 border text-sm py-2 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>User Information</CardTitle>
          </div>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20 border-4 border-primary">
                {avatarSignedUrl && <AvatarImage src={avatarSignedUrl} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-white font-semibold text-2xl">
                  {user && getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <Upload className="h-3 w-3" />
                {uploading ? "Uploading..." : "Change photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex-1 space-y-2">

              {/* Name */}
              <div>
                <div className="text-sm text-gray-500">Name</div>
                {!nameEditMode ? (
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-medium">
                      {user?.first_name} {user?.last_name}
                    </div>
                    <button
                      type="button"
                      onClick={openNameEdit}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        placeholder="First name"
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                      <input
                        type="text"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        placeholder="Last name"
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={nameStatus === "saving"}
                        onClick={handleSaveName}
                        className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
                      >
                        {nameStatus === "saving" ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNameEditMode(false); setNameStatus("idle"); }}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    {nameStatus === "error" && (
                      <p className="text-xs text-red-500">{nameError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <div className="text-sm text-gray-500">Email</div>
                {!emailEditMode ? (
                  <div className="flex items-center gap-2">
                    <div className="text-base">{user?.email}</div>
                    <button
                      type="button"
                      onClick={() => { setEmailEditMode(true); setEmailStatus("idle"); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="New email address"
                      className="border rounded px-2 py-1 text-sm w-full max-w-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={emailStatus === "sending" || !newEmail}
                        onClick={handleRequestEmailChange}
                        className="text-xs bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
                      >
                        {emailStatus === "sending" ? "Sending..." : "Send verification"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEmailEditMode(false); setNewEmail(""); setEmailStatus("idle"); }}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    {emailStatus === "sent" && (
                      <p className="text-xs text-green-600">{emailStatusMsg}</p>
                    )}
                    {emailStatus === "error" && (
                      <p className="text-xs text-red-500">{emailStatusMsg}</p>
                    )}
                  </div>
                )}
              </div>

              {/* User ID */}
              <div>
                <div className="text-sm text-gray-500">User ID</div>
                <div className="text-base font-mono">{user && formatUserId(user.id)}</div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Face Data Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" />
            <CardTitle>Face Data</CardTitle>
          </div>
          <CardDescription></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Rescan face</div>
              <div className="text-sm text-gray-500">
                Clears your saved face data and takes you through setup again
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetFace}
              disabled={faceResetStatus === "resetting"}
              className="text-sm bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              {faceResetStatus === "resetting" ? "Resetting..." : "Reset & Rescan"}
            </button>
          </div>
          {faceResetStatus === "error" && (
            <p className="text-xs text-red-500 mt-2">Something went wrong. Please try again.</p>
          )}
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize how VeriFace looks on your device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-sm text-gray-500">
                Choose between light and dark mode
              </div>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
