import Image from "next/image";

/**
 * A vehicle class's picture in its frame, the whole vehicle in view: a
 * photo or a cut-out alike. With no picture the frame stays empty, so a
 * list where some classes have one still lines up. The class's name is
 * always written beside it, so the picture is decorative.
 */
export function ClassPicture({
  src,
  sizes,
  className = "",
}: {
  /** The class's picture on UploadThing; null for none. */
  src: string | null;
  /** As next/image takes it: how wide the frame is drawn. */
  sizes: string;
  className?: string;
}) {
  return (
    <span
      className={`relative block aspect-[3/2] overflow-hidden rounded-[12px] bg-mist ${className}`}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} className="object-contain" />
      ) : null}
    </span>
  );
}
