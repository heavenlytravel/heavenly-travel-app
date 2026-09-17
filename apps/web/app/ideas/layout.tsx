import { LandingSwitcher } from "../_components/LandingSwitcher";

export default function IdeasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <LandingSwitcher />
    </>
  );
}
