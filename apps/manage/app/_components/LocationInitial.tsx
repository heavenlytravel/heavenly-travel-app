/**
 * A location's initial, large, where its photo would be: a tile of the
 * home page's choices or of the locations in Settings, before a hero
 * image is picked.
 */
export function LocationInitial({ name }: { name: string }) {
  return (
    <span className="font-serif text-5xl text-slot">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
