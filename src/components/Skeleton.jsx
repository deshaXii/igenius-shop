export default function Skeleton({ className = "" }) {
  return (
    <div
      className={`skel rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  );
}
