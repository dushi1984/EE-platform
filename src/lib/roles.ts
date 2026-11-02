import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

/** Only teachers may pass; students are sent to their dashboard, guests to login. */
export async function requireTeacher() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "teacher") redirect("/dashboard");
  return user;
}
