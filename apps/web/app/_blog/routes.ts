import "server-only";
import {
  BLOG_LABEL,
  BLOG_PATH,
  SITE_NAME,
  SITE_URL,
  blogPostFallbackTitle,
  blogPostPath,
  blogPostPreviewPath,
  checkBlogPostSlug,
  getAdminAccess,
  type BlogPostView,
} from "@repo/db/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Crumb } from "../_components/page-parts";
import { blogPostDraft, publishedBlogPost } from "../_lib/blog";
import { signInHref } from "../_lib/routes";
import { breadcrumbDataOf, faqDataOf, pageMetadata } from "../_lib/seo";

/**
 * What a blog post's routes show, and what they tell search engines: the
 * published post, or for staff its draft, with whoever may not see it
 * answered here, by a 404 or the sign-in. The routes themselves are thin.
 */

/** The published post at the slug; a 404 while there is none. */
export async function publishedPostAt(slug: string): Promise<BlogPostView> {
  const post = await publishedBlogPost(slug);
  if (!post) notFound();
  return post;
}

/**
 * The staff preview of the post at the slug: its draft, for a signed-in
 * admin who holds `pages.manage`, as the console's Blog asks. A signed-out
 * visitor is sent to sign in and comes back here; anyone else gets a 404.
 * The slug is checked before the session is read, because the proxy
 * attaches no session to a path that looks like a file.
 */
export async function previewPostAt(slug: string): Promise<BlogPostView> {
  if (!checkBlogPostSlug(slug).ok) notFound();
  const access = await getAdminAccess("pages.manage");
  if (access.status === "signed-out") {
    redirect(signInHref(blogPostPreviewPath(slug)));
  }
  if (access.status !== "ok") notFound();
  const post = await blogPostDraft(slug);
  if (!post) notFound();
  return post;
}

/** A post's name: its title, else its slug. */
export function postTitleOf(post: BlogPostView) {
  return post.content.heroHeadline || post.slug;
}

/** The blog's steps from the home page, "Home / Blog", then `current` under it when given. */
export function blogCrumbsOf(current?: { name: string; path: string }) {
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: BLOG_LABEL, path: BLOG_PATH },
  ];
  return current ? [...crumbs, current] : crumbs;
}

/** A post's metadata, as `pageMetadata` makes it, with its dates. */
export function postMetadata(post: BlogPostView, preview = false): Metadata {
  return pageMetadata(post.content, {
    path: blogPostPath(post.slug),
    fallbackTitle: blogPostFallbackTitle(postTitleOf(post)),
    preview,
    article: {
      publishedTime: post.firstPublishedAt,
      modifiedTime: post.publishedAt,
    },
  });
}

/** A post's `BreadcrumbList`, its `FAQPage` when it has FAQs, and its `Article`. Addresses are public ones. */
export function postStructuredData(post: BlogPostView): object[] {
  const path = blogPostPath(post.slug);
  const { heroHeadline, heroSubheadline, heroImage } = post.content;
  const faqs = faqDataOf(post.content);
  return [
    breadcrumbDataOf(blogCrumbsOf({ name: postTitleOf(post), path })),
    ...(faqs ? [faqs] : []),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: heroHeadline,
      description: heroSubheadline,
      image: heroImage ? [heroImage.url] : undefined,
      datePublished: post.firstPublishedAt ?? undefined,
      dateModified: post.publishedAt ?? undefined,
      mainEntityOfPage: SITE_URL + path,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
  ];
}

/** The metadata of one of the blog's lists: its title, its line and its address. */
export function blogListMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = SITE_URL + path;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
    },
  };
}
