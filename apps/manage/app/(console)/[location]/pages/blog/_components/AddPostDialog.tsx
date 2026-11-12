"use client";

import {
  BLOG_PATH,
  ENTRY_LIMITS,
  PAGE_LIMITS,
  checkBlogPostSlug,
  slugify,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { PlusIcon } from "@repo/ui/icons";
import { useActionForm } from "@repo/console/use-action-form";
import { useState } from "react";
import { EntrySlugField } from "../../../settings/SlugField";
import { createBlogPostAction } from "../actions";

/**
 * "Add post" on Blog: the post's title, and its slug made from the title
 * until Marketing edits it. The post starts as a draft and its editor
 * opens. A refusal about the title or the slug shows under that field.
 */
export function AddPostDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const { pending, error, formProps } = useActionForm(createBlogPostAction, {
    done: "Post added. Write it, then publish.",
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Add post
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add post"
        description="It starts as a draft: nothing is public until you publish it."
      >
        <form {...formProps} className="grid gap-4">
          <Field label="Title">
            <Input
              name="title"
              required
              autoComplete="off"
              maxLength={PAGE_LIMITS.heroHeadline}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugEdited) {
                  setSlug(
                    slugify(event.target.value).slice(0, ENTRY_LIMITS.slug),
                  );
                }
              }}
            />
          </Field>
          <EntrySlugField
            value={slug}
            onChange={(next) => {
              setSlug(next);
              setSlugEdited(true);
            }}
            under={BLOG_PATH}
            check={checkBlogPostSlug}
          />
          <FormError error={error} />
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" pending={pending}>
              {pending ? "Adding…" : "Add post"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
