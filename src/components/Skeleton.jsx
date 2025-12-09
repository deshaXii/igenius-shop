export default function Skeleton({ className = "" }) {
  return (
    <div
      className={`skel rounded-xl bg-gray-200/80 dark:bg-gray-800/80 ${className}`}
    />
  );
}
