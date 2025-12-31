// src/components/topics/tabs/MediaTab.jsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Image, Upload, X } from "lucide-react";

export function MediaTab({
  imageFile,
  imagePreviewUrl,
  existingImageUrl,
  onImageChange,
  onRemoveImage
}) {
  const hasImage = imageFile || existingImageUrl;
  const previewUrl = imagePreviewUrl || existingImageUrl;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-300">
          <Image className="w-4 h-4" />
          Titelbild
        </Label>

        {hasImage ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Vorschau"
              className="w-full h-48 object-cover rounded-lg border border-slate-700"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRemoveImage}
              className="absolute top-2 right-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors bg-slate-800/30">
            <Upload className="w-10 h-10 text-slate-500 mb-2" />
            <span className="text-sm text-slate-400">
              Klicken Sie hier, um ein Bild hochzuladen
            </span>
            <span className="text-xs text-slate-500 mt-1">
              JPG, PNG oder GIF (max. 5MB)
            </span>
            <Input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <p className="text-xs text-slate-400">
          Das Titelbild wird in der Themenübersicht als Hintergrund angezeigt.
          Empfohlene Größe: 800x400 Pixel.
        </p>
      </div>
    </div>
  );
}

export default MediaTab;
