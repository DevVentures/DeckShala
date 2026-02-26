import { redirect } from "next/navigation";

/**
 * Root page — middleware handles the redirect in most cases.
 * This is a fallback for environments where middleware is bypassed.
 */
export default function Home() {
  redirect("/presentation");
}
