import Link from 'next/link';

/** Shown by data pages when no organization is selected yet. */
export default function NoOrg() {
  return (
    <p className="text-secondary">
      No organization selected.{' '}
      <Link href="/" className="underline">
        Choose one
      </Link>
      .
    </p>
  );
}
