"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { scanReceipt, scanReceiptText } from "@/actions/transaction";

export function ReceiptScanner({ onScanComplete }) {
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
  } = useFetch(scanReceipt);
  const {
    loading: scanTextLoading,
    fn: scanReceiptTextFn,
  } = useFetch(scanReceiptText);

  const handleReceiptScan = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    const isImageFile = file.type.startsWith("image/");
    const isTextLike =
      file.type.startsWith("text/") || /\.(txt|csv|log|md)$/i.test(file.name);
    let result;

    if (isImageFile) {
      try {
        setOcrLoading(true);
        const Tesseract = await import("tesseract.js");
        const ocrResponse = await Tesseract.recognize(file, "eng");
        const extractedText = ocrResponse?.data?.text || "";
        if (!extractedText.trim()) {
          throw new Error("No readable text found in image");
        }
        result = await scanReceiptTextFn(extractedText);
      } catch (error) {
        toast.error(error?.message || "Could not read text from receipt image");
        return;
      } finally {
        setOcrLoading(false);
      }
    } else if (isTextLike) {
      result = await scanReceiptFn(file);
    } else {
      toast.error("Upload an image or text receipt file");
      return;
    }

    if (result) {
      onScanComplete(result);
    }
  };

  const handleTextScan = async () => {
    const rawText = textInputRef.current?.value || "";
    if (!rawText.trim()) {
      toast.error("Please paste receipt text first");
      return;
    }
    const result = await scanReceiptTextFn(rawText);
    if (result) {
      onScanComplete(result);
    }
  };

  return (
    <div className="space-y-3">
      <Input
        ref={textInputRef}
        placeholder="Paste receipt text for local scan (best accuracy)"
        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 border-border text-foreground"
        onClick={handleTextScan}
        disabled={scanTextLoading || ocrLoading}
      >
        {scanTextLoading || ocrLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            <span>{ocrLoading ? "Reading Image Text..." : "Scanning Text..."}</span>
          </>
        ) : (
          <>
            <ScanText className="mr-2" />
            <span>Scan Receipt Text (Local Model)</span>
          </>
        )}
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,.txt,.csv,.log,.md,text/plain"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReceiptScan(file);
          // Allow selecting the same file again.
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading || scanTextLoading || ocrLoading}
      >
        {scanReceiptLoading || ocrLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            <span>{ocrLoading ? "Extracting text from image..." : "Scanning Receipt..."}</span>
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            <span>Upload Receipt (Local Model)</span>
          </>
        )}
      </Button>
    </div>
  );
}