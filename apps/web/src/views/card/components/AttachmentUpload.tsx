import { t } from "@lingui/core/macro";
import { useRef, useState } from "react";
import { HiOutlinePaperClip } from "react-icons/hi";
import { HiCheckBadge } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { generateUID } from "@kan/shared/utils";

import Button from "~/components/Button";
import { usePopup } from "~/providers/popup";
import { env } from "next-runtime-env";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface AttachmentUploadProps {
  cardPublicId: string;
  checklistCount: number;
  onChecklistCreated: (id: string) => void;
}

export function AttachmentUpload({ cardPublicId, checklistCount, onChecklistCreated }: AttachmentUploadProps) {
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const createChecklist = api.checklist.create.useMutation({
    onMutate: async (args) => {
      await utils.card.byId.cancel({ cardPublicId: args.cardPublicId });
      const previous = utils.card.byId.getData({
        cardPublicId: args.cardPublicId,
      });
      utils.card.byId.setData({ cardPublicId: args.cardPublicId }, (old) => {
        if (!old) return old as any;
        const placeholderChecklist = {
          publicId: `PLACEHOLDER_${generateUID()}`,
          name: args.name,
          index: old.checklists.length,
          items: [] as {
            publicId: string;
            title: string;
            completed: boolean;
            index: number;
          }[],
        };
        return {
          ...old,
          checklists: [...old.checklists, placeholderChecklist],
        } as typeof old;
      });
      return { previous };
    },
    onSuccess: (data) => {
      onChecklistCreated(data.publicId);
    },
    onError: (_error, vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData(
          { cardPublicId: vars.cardPublicId },
          ctx.previous,
        );
      showPopup({
        header: t`Unable to create checklist`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async (_data, _error, vars) => {
      await invalidateCard(utils, vars.cardPublicId);
    },
  });

  const uploadFile = async (file: File) => {
    setUploading(true);

    try {
      const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
      const response = await fetch(
        `${baseUrl}/api/upload/attachment?cardPublicId=${encodeURIComponent(cardPublicId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": file.type,
            "x-original-filename": file.name,
          },
          body: file,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      await invalidateCard(utils, cardPublicId);
      showPopup({
        header: t`Attachment uploaded`,
        message: t`Your file has been uploaded successfully.`,
        icon: "success",
      });
    } catch {
      showPopup({
        header: t`Upload failed`,
        message: t`Failed to upload attachment. Please try again.`,
        icon: "error",
      });
      setUploading(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = "";

    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Upload the first file (or could upload all files)
    await uploadFile(files[0] ?? new File([], ""));
  };

  return (
    <div className="mb-6">
      <input
        ref={inputRef}
        type="file"
        id="attachment-upload"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={twMerge(
          "rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-light-300 bg-light-100 dark:border-dark-300 dark:bg-dark-100"
            : "border-transparent",
        )}
      >
        <div className="flex items-center justify-end gap-2 p-2">
          <Button
            type="button"
            variant="ghost"
            iconLeft={
              <HiOutlinePaperClip className="h-5 w-5 text-light-950 dark:text-dark-950" />
            }
            isLoading={uploading}
            disabled={uploading}
            iconOnly
            onClick={() => inputRef.current?.click()}
          />
          <Button
            type="button"
            variant="ghost"
            iconLeft={
              <HiCheckBadge className="h-5 w-5 text-light-950 dark:text-dark-950" />
            }
            iconOnly
            onClick={() => createChecklist.mutate({
              name: `Checklist ${checklistCount + 1}`,
              cardPublicId,
            })}
          />
        </div>
      </div>
    </div>
  );
}
