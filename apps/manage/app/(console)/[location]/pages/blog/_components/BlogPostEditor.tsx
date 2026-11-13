"use client";

import { BLOG_PATH, checkBlogPostSlug } from "@repo/db";
import { errorOf } from "@repo/console/action-state";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { FormError } from "@repo/ui/form-error";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentProps } from "react";
import { PageEditor } from "../../../../../_components/page-editor/PageEditor";
import { EntrySlugField } from "../../../settings/SlugField";
import { deleteBlogPostAction, renameBlogPostAction } from "../actions";

/** A post as its editor names it to change its slug or delete it. */
export type PostOfEditor = {
  id: string;
  slug: string;
  slugLocked: boolean;
  /** Whether the public sees it now, so a delete takes a public address. */
  isPublic: boolean;
};

/**
 * A blog post in the page editor, with its slug, which changes in a dialog
 * until the first publish, and Delete, which asks first.
 */
export function BlogPostEditor({
  post,
  ...props
}: Omit<ComponentProps<typeof PageEditor>, "entry"> & {
  post: PostOfEditor;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [confirmDialog, confirm] = useConfirm();

  async function remove(): Promise<string | null> {
    const goAhead = await confirm({
      title: "Delete this post?",
      description: post.isPublic
        ? "The public sees it now: its address stops working at once. Its draft and its published copy go; its publishes stay in the log."
        : "Its draft goes, and its address is free again. Its publishes stay in the log.",
      action: "Delete",
      danger: true,
    });
    if (!goAhead) return null;
    const answer = await answerOf(deleteBlogPostAction(post.id));
    const refused = errorOf(answer);
    if (refused) return refused;
    toast.success("Deleted.");
    if (answer && "href" in answer) router.push(answer.href);
    return null;
  }

  return (
    <>
      <PageEditor
        {...props}
        entry={{
          slugLocked: post.slugLocked,
          one: "post",
          onRename: () => setRenaming(true),
          onDelete: remove,
        }}
      />
      {post.slugLocked ? null : (
        <RenameDialog open={renaming} onOpenChange={setRenaming} post={post} />
      )}
      {confirmDialog}
    </>
  );
}

/** Changes the slug of a post not yet published. The refusal shows under the field. */
function RenameDialog({
  open,
  onOpenChange,
  post,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PostOfEditor;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(post.slug);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(renameBlogPostAction(post.id, slug)),
      );
      if (refused) {
        setError(refused);
        return;
      }
      toast.success("Slug changed.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change the Slug"
      description="The end of the post's address. It is locked once the post is first published."
    >
      <form onSubmit={submit} className="grid gap-4">
        <EntrySlugField
          value={slug}
          onChange={(next) => {
            setSlug(next);
            setError(null);
          }}
          under={BLOG_PATH}
          check={checkBlogPostSlug}
        />
        <FormError error={error} />
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={slug === post.slug} pending={pending}>
            {pending ? "Changing…" : "Change Slug"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
