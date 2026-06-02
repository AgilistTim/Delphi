export function Avatar({ name, size = "" }: { name: string; size?: "" | "sm" | "lg" }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <span className={`avatar ${size}`}>{initials}</span>;
}
