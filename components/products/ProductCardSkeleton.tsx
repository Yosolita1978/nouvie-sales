export function ProductCardSkeleton() {
    return (
      <div className="card p-4 animate-pulse">
        {/* Name skeleton */}
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
  
        {/* Category badge skeleton */}
        <div className="mt-2">
          <div className="h-5 bg-gray-200 rounded-full w-20"></div>
        </div>
  
        {/* Price skeleton */}
        <div className="mt-3">
          <div className="h-7 bg-gray-200 rounded w-28"></div>
          <div className="h-4 bg-gray-200 rounded w-16 mt-1"></div>
        </div>
  
        {/* Stock skeleton */}
        <div className="mt-3 flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </div>
      </div>
    )
  }
  
  export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </>
    )
  }