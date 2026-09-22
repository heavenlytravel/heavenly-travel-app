import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Create an account | Heavenly Travel",
};

export default function SignUpPage() {
  return <SignUp />;
}
