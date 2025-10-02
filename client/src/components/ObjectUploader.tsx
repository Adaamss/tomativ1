// client/src/components/ObjectUploader.tsx
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import XHRUpload from "@uppy/xhr-upload";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  /**
   * NOTE: we're not using getUploadParameters here because the server
   * currently expects a multipart POST handled by multer (upload.single('file')).
   */
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);

  // Create uppy instance once
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ["image/*"],
      },
      autoProceed: false,
    })
  );

  useEffect(() => {
    // Attach XHRUpload plugin that POSTs multipart form-data to our server
    try {
      uppy.use(XHRUpload, {
        endpoint: "/api/objects/upload", // server endpoint that expects multipart
        fieldName: "file",
        formData: true,
        bundle: false,
      });
    } catch (err) {
      // If the plugin is already added, this can throw — ignore that case
      // (we'll still attach listeners below)
      // console.warn("XHRUpload plugin may already be added:", err);
    }

    function onCompleteHandler(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) {
      console.log("[ObjectUploader] uppy complete:", result);
      onComplete?.(result);
      setShowModal(false);
    }

    function onError(file: any, err: any) {
      console.error("[ObjectUploader] upload-error:", err, "file:", file);
    }

    function onSuccess(file: any, response: any) {
      // Uppy XHRUpload exposes `response` as server response (parsed JSON) in some builds.
      // But to be robust, we don't rely only on this — handleUploadComplete should also check result.successful[0].response
      console.log("[ObjectUploader] upload-success file:", file?.name, "response:", response);
      if (response && (response as any).body && file) {
        (file as any).uploadURL = (response as any).body.uploadURL;
      } else if (response && (response as any).uploadURL && file) {
        (file as any).uploadURL = (response as any).uploadURL;
      }
    }

    uppy.on("complete", onCompleteHandler);
    uppy.on("upload-error", onError);
    uppy.on("upload-success", onSuccess);

    return () => {
      try {
        uppy.off("complete", onCompleteHandler);
        uppy.off("upload-error", onError);
        uppy.off("upload-success", onSuccess);
      } catch (e) { }
      uppy.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
