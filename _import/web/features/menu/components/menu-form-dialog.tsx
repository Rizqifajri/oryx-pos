"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useCategories } from "../hooks/use-categories";
import { useCreateMenu, useUpdateMenu } from "../hooks/use-menus";
import { uploadMenuImage } from "../lib/upload-menu-image";
import { createMenuSchema, type CreateMenuValues } from "../schemas/menu";
import type { Menu } from "../types";
import { MenuImageField } from "./menu-image-field";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: Menu;
  filterTenantId?: string | null;
}

export function MenuFormDialog({
  open,
  onOpenChange,
  editTarget,
  filterTenantId,
}: Props) {
  const isEdit = !!editTarget;
  const { mutate: create, isPending: creating } = useCreateMenu(filterTenantId);
  const { mutate: update, isPending: updating } = useUpdateMenu();
  const { data: categories = [] } = useCategories(
    filterTenantId ? { tenantId: filterTenantId } : undefined,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | undefined>();
  const [uploadingImage, setUploadingImage] = useState(false);
  const isPending = creating || updating || uploadingImage;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMenuValues>({
    resolver: zodResolver(createMenuSchema) as any,
    defaultValues: { isAvailable: true },
  });

  useEffect(() => {
    if (editTarget) {
      reset({
        name: editTarget.name,
        categoryId: editTarget.categoryId,
        description: editTarget.description ?? "",
        price: editTarget.price / 100,
        isAvailable: editTarget.isAvailable,
      });
    } else {
      reset({ isAvailable: true, price: undefined, categoryId: "" });
    }
    setImageFile(null);
    setImageError(undefined);
  }, [editTarget, open, reset]);

  async function onSubmit(values: CreateMenuValues) {
    setImageError(undefined);
    let imageUrl = editTarget?.imageUrl;

    if (imageFile) {
      try {
        setUploadingImage(true);
        imageUrl = await uploadMenuImage(imageFile);
      } catch (err) {
        setImageError(
          err instanceof Error ? err.message : "Failed to upload image",
        );
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    const payload = { ...values, imageUrl: imageUrl || undefined };

    if (isEdit) {
      update(
        { id: editTarget.id, ...payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  const inputClass =
    "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false} 
        className='flex max-h-[90vh] w-[calc(100%-1rem)] flex-col gap-4 sm:max-w-lg md:max-w-xl'
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Menu Item" : "Add Menu Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-1 flex-col overflow-hidden'>
          <div className='flex-1 overflow-y-auto px-1 -mx-1'>
            <FieldSet disabled={isPending}>
              <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor='menu-name'>Name</FieldLabel>
                <Input
                  id='menu-name'
                  placeholder='e.g. Caesar Salad'
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.categoryId}>
                <FieldLabel htmlFor='menu-category'>Category</FieldLabel>
                <select
                  id='menu-category'
                  aria-invalid={!!errors.categoryId}
                  className={cn(inputClass, "bg-background")}
                  {...register("categoryId")}
                >
                  <option value=''>Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <FieldError errors={[errors.categoryId]} />
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor='menu-desc'>Description</FieldLabel>
                <textarea
                  id='menu-desc'
                  rows={2}
                  placeholder='Optional description…'
                  aria-invalid={!!errors.description}
                  className={cn(inputClass, "h-auto resize-none py-1.5")}
                  {...register("description")}
                />
                <FieldError errors={[errors.description]} />
              </Field>

              <Field data-invalid={!!errors.price}>
                <FieldLabel htmlFor='menu-price'>Price</FieldLabel>
                <Input
                  id='menu-price'
                  type='number'
                  step='0.01'
                  min='0'
                  placeholder='0.00'
                  aria-invalid={!!errors.price}
                  {...register("price")}
                />
                <FieldError errors={[errors.price]} />
              </Field>

              <MenuImageField
                existingUrl={editTarget?.imageUrl}
                disabled={isPending}
                error={imageError}
                onChange={setImageFile}
              />

              <div className='flex items-center gap-2 pt-1'>
                <input
                  id='menu-available'
                  type='checkbox'
                  className='size-4 rounded border-input'
                  {...register("isAvailable")}
                />
                <label htmlFor='menu-available' className='text-sm font-medium'>
                  Available
                </label>
              </div>
              </FieldGroup>
            </FieldSet>
          </div>
          <DialogFooter className='mt-2 shrink-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
