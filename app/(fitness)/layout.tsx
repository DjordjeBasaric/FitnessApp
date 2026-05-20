import { FitnessShell } from "@/components/FitnessShell";

export default function FitnessGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <FitnessShell>{children}</FitnessShell>;
}
