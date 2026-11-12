import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOG_ALL_PATH,
  BLOG_HOME_NEWEST,
  blogHomeOf,
  blogPostEditorPath,
  blogPostPath,
  blogPostPreviewPath,
  blogPostPublishPath,
  checkBlogPostSlug,
} from "./blog-input";

describe("the blog's addresses", () => {
  it("puts a post under /blog, its preview under /preview, its editor under the console's Blog", () => {
    assert.equal(blogPostPath("a-day"), "/blog/a-day");
    assert.equal(blogPostPreviewPath("a-day"), "/preview/blog/a-day");
    assert.equal(BLOG_ALL_PATH, "/blog/all");
    assert.equal(blogPostEditorPath("p1"), "/~/pages/blog/p1");
    assert.equal(blogPostPublishPath("e1"), "/~/pages/blog/history/e1");
  });
});

describe("checkBlogPostSlug", () => {
  it("takes a page's slug, but not the list of every post's", () => {
    assert.equal(checkBlogPostSlug("a-day-in-langkawi").ok, true);
    assert.equal(checkBlogPostSlug("").ok, false);
    assert.equal(checkBlogPostSlug("A Day").ok, false);
    const all = checkBlogPostSlug("all");
    assert.equal(all.ok, false);
    assert.equal(!all.ok && all.field, "slug");
  });
});

describe("blogHomeOf", () => {
  const post = (slug: string, highlightOrder: number | null = null) => ({
    slug,
    highlightOrder,
  });

  it("shows the highlighted posts in their order, then the newest of the rest", () => {
    const home = blogHomeOf([
      post("newest"),
      post("second", 2),
      post("third"),
      post("first", 1),
    ]);
    assert.deepEqual(
      home.highlighted.map((p) => p.slug),
      ["first", "second"],
    );
    assert.deepEqual(
      home.newest.map((p) => p.slug),
      ["newest", "third"],
    );
  });

  it("shows at most so many of the newest", () => {
    const rest = Array.from({ length: BLOG_HOME_NEWEST + 1 }, (_, i) =>
      post(`p${i}`),
    );
    assert.deepEqual(
      blogHomeOf(rest).newest.map((p) => p.slug),
      rest.slice(0, BLOG_HOME_NEWEST).map((p) => p.slug),
    );
  });
});
