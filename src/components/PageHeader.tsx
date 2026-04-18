export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white px-5 py-4">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      ) : null}
    </header>
  );
}
