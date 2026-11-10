import { notFound } from "next/navigation";

/**
 * Any console path without a page. Signed-in visitors get the console's own not-found page
 * (inside the shell, with the navigation still there) rather than the bare root one; the proxy
 * has already sent signed-out visitors to sign in.
 */
export default function MissingPage(): never {
  notFound();
}
