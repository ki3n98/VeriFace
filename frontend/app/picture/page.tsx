"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../sign-in/sign-in.module.css";
import { apiClient } from "@/lib/api";

type HasEmbeddingsResponse =
  | { has_embeddings: boolean }
  | { hasEmbeddings: boolean }
  | { ok: boolean }
  | boolean;

function coerceHasEmbeddings(data: HasEmbeddingsResponse): boolean {
  if (typeof data === "boolean") return data;
  if (typeof (data as any)?.has_embeddings === "boolean")
    return (data as any).has_embeddings;
  if (typeof (data as any)?.hasEmbeddings === "boolean")
    return (data as any).hasEmbeddings;
  if (typeof (data as any)?.ok === "boolean") return (data as any).ok;
  return false;
}

function toErrorString(err: unknown): string {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;

  const detail = (err as any)?.detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first?.msg) return String(first.msg);
    return JSON.stringify(detail);
  }

  if ((err as any)?.error) return toErrorString((err as any).error);
  if ((err as any)?.message) return String((err as any).message);
  if ((err as any)?.msg) return String((err as any).msg);

  try {
    return JSON.stringify(err);
  } catch {
    return "Something went wrong.";
  }
}

export default function PicturePage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isCheckingEmbeddings, setIsCheckingEmbeddings] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setIsCheckingEmbeddings(true);
      setError(null);

      try {
        const res = await apiClient.post<HasEmbeddingsResponse>(
          "/protected/model/hasEmbedding",
          {},
        );

        const has = coerceHasEmbeddings((res as any)?.data ?? (res as any));

        if (!cancelled) {
          if (has) router.replace("/events");
          else setIsCheckingEmbeddings(false);
        }
      } catch (e) {
        if (!cancelled) {
          setIsCheckingEmbeddings(false);
          setError(toErrorString(e));
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const onUpload = async () => {
    setError(null);
    if (!file) return setError("Please choose a picture.");

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return setError("Please upload a JPG, PNG, or WebP image.");
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) return setError("Image too large (max 5MB).");

    try {
      setIsUploading(true);

      const fd = new FormData();

      fd.append("upload_image", file, file.name);

      const response = await apiClient.post<any>(
        "/protected/uploadPicture",
        fd,
      );

      if ((response as any)?.error) {
        setError(toErrorString((response as any).error));
        return;
      }

      router.push("/events");
    } catch (e) {
      setError(toErrorString(e));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <img src="/logo.png" className={styles.logo} alt="Logo" />

      <div
        className={styles.card}
        style={{ maxWidth: 640, margin: "24px auto" }}
      >
        <h1 className={styles.title}>Upload Profile Picture</h1>
        <p style={{ marginBottom: 16, color: "#666" }}>
          Add a profile picture so we can generate your embedding. JPG/PNG/WebP,
          up to 5MB.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: 120,
                height: 120,
                objectFit: "cover",
                borderRadius: "999px",
                border: "1px solid #eee",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                border: "1px dashed #ddd",
                color: "#999",
                flexShrink: 0,
              }}
            >
              No image
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: isUploading ? "not-allowed" : "pointer",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontWeight: 600 }}>Choose file</span>

              <span
                style={{
                  color: "#666",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  textAlign: "right",
                }}
                title={file?.name || "No file chosen"}
              >
                {file?.name || "No file chosen"}
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={onPickFile}
                disabled={isUploading}
                style={{ display: "none" }}
              />
            </label>

            {file && (
              <div style={{ color: "#444", fontSize: 14, marginTop: 8 }}>
                <strong>{file.name}</strong>{" "}
                <span style={{ color: "#777" }}>
                  — {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className={styles.error} style={{ marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            className={styles.button}
            onClick={onUpload}
            disabled={!file || isUploading}
            style={{
              flex: 1,
              opacity: !file || isUploading ? 0.6 : 1,
              cursor: !file || isUploading ? "not-allowed" : "pointer",
            }}
          >
            {isUploading ? "Uploading..." : "Upload & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
