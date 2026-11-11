export default function LoadingSpinner({ size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-16 w-16' : 'h-10 w-10';
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className={`animate-spin rounded-full ${sizeClass} border-t-2 border-b-2 border-orange-500`}
      />
    </div>
  );
}
