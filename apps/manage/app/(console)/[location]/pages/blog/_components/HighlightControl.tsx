"use client";

import { BLOG_HIGHLIGHT_CAP, blogPostPath } from "@repo/db";
import type { BlogPostSummary } from "@repo/db/server";
import { errorOf } from "@repo/console/action-state";
import { Tile, TileFoot, TileGrid } from "@repo/console/Card";
import { PageStatusBadge } from "@repo/console/StatusBadges";
import { answerOf } from "@repo/ui/action-answer";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { FormError } from "@repo/ui/form-error";
import { Select } from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CardImage } from "../../../../../_components/CardImage";
import { LocationInitial } from "../../../../../_components/LocationInitial";
import { MoveButtons } from "../../../../../_components/MoveButtons";
import { blogPostHref } from "../../../../../_lib/routes";
import { changeBlogHighlightAction } from "../actions";

/**
 * The blog's highlighted posts as cards, in their slots and in order, as
 * the blog's home shows them first: each with its cover, its place and its
 * status, to move earlier or later or take off, saved at once. The first
 * empty slot adds one of the published posts not highlighted yet. A post
 * unpublished since keeps its place and is left off the blog's home until
 * it is published again.
 */
export function HighlightControl({
  highlighted,
  candidates,
}: {
  /** Every highlighted post, in order. */
  highlighted: BlogPostSummary[];
  /** The published posts not highlighted, newest first. */
  candidates: BlogPostSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState("");
  const full = highlighted.length >= BLOG_HIGHLIGHT_CAP;
  // The one to add: what was picked, while it can still be added.
  const toAdd =
    candidates.find((post) => post.id === picked) ?? candidates[0] ?? null;
  const slots = Array.from(
    { length: Math.max(BLOG_HIGHLIGHT_CAP, highlighted.length) },
    (_, place) => highlighted[place] ?? null,
  );

  function change(post: BlogPostSummary, what: "add" | "remove") {
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(changeBlogHighlightAction(post.id, what)),
      );
      setError(refused);
      if (!refused) {
        toast.success(
          what === "add"
            ? `“${post.title}” is highlighted.`
            : `“${post.title}” is no longer highlighted.`,
        );
      }
    });
  }

  return (
    <div className="grid gap-4">
      <TileGrid min="thirds">
        {slots.map((post, place) =>
          post ? (
            <Tile key={post.id}>
              <CardImage
                src={post.heroImage?.url ?? null}
                sizes="(min-width: 1024px) 18rem, (min-width: 640px) 50vw, 100vw"
                fallback={<LocationInitial name={post.title} />}
              >
                <Badge>{place + 1}</Badge>
                <PageStatusBadge status={post.status} />
              </CardImage>
              <div className="min-w-0 px-4 pt-3 pb-4">
                <h3 className="truncate text-base font-bold tracking-tight text-ink">
                  <Link href={blogPostHref(post.id)} className="card-link">
                    {post.title}
                  </Link>
                </h3>
                <p className="text-xs text-muted">
                  {post.status === "unpublished"
                    ? "Left off the blog while not published"
                    : blogPostPath(post.slug)}
                </p>
              </div>
              <TileFoot>
                <MoveButtons
                  name={`“${post.title}”`}
                  first={place === 0}
                  last={place === highlighted.length - 1}
                  move={(by) =>
                    changeBlogHighlightAction(post.id, by < 0 ? "up" : "down")
                  }
                />
                <Button
                  variant="ghost-danger"
                  size="sm"
                  pending={pending}
                  aria-label={`Take “${post.title}” off the highlights`}
                  className="ml-auto"
                  onClick={() => change(post, "remove")}
                >
                  Remove
                </Button>
              </TileFoot>
            </Tile>
          ) : (
            <li key={`empty-${place}`} className="min-w-0">
              <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-slot p-4 text-center">
                <span className="text-sm text-muted">
                  Slot {place + 1} is empty
                </span>
                {place === highlighted.length && toAdd ? (
                  <div className="flex w-full max-w-60 flex-col gap-2">
                    <Select
                      aria-label="Post to highlight"
                      value={toAdd.id}
                      disabled={pending}
                      onValueChange={setPicked}
                      options={candidates.map((candidate) => ({
                        value: candidate.id,
                        label: candidate.title,
                      }))}
                    />
                    <Button
                      variant="secondary"
                      pending={pending}
                      onClick={() => change(toAdd, "add")}
                    >
                      Highlight
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ),
        )}
      </TileGrid>
      <p className="text-xs text-muted">
        {full
          ? `The blog highlights at most ${BLOG_HIGHLIGHT_CAP} posts. Remove one to add another.`
          : candidates.length === 0
            ? "No published post is left to highlight. Only a published post can be highlighted."
            : "A post is added in the first empty slot. Only a published post can be highlighted."}
      </p>
      <FormError error={error} />
    </div>
  );
}
