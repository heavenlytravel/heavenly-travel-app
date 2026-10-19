"use client";

import { checkImageFile, type UploadedImage } from "@repo/db";
import { useState } from "react";

const FAILED = "The image could not be uploaded. Try again.";

/**
 * Stores an image the moment it is chosen, at the upload route given, and
 * answers it as an `UploadedImage`, or null with the reason kept in
 * `error`. A form's one image and a model's list of photos both upload
 * through it; the form keeps the address once it is saved.
 */
export function useImageUpload(uploadPath: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<UploadedImage | null> {
    const check = checkImageFile(file);
    if (!check.ok) {
      setError(check.error);
      return null;
    }
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(uploadPath, { method: "POST", body });
      const answer = (await response.json()) as
        UploadedImage | { error?: string };
      if (!response.ok || !("url" in answer)) {
        setError(("error" in answer && answer.error) || FAILED);
        return null;
      }
      return answer;
    } catch {
      setError(FAILED);
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error };
}
