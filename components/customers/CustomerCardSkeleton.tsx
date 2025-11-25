export function CustomerCardSkeleton() {
    return (
      <div className="card p-4 animate-pulse">
        {/* Name skeleton */}
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
  
        {/* Badge skeleton */}
        <div className="mt-2">
          <div className="h-5 bg-gray-200 rounded-full w-24"></div>
        </div>
  
        {/* Contact info skeleton */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-28"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    )
  }
  
  // Multiple skeletons for grid
  export function CustomerGridSkeleton({ count = 6 }: { count?: number }) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <CustomerCardSkeleton key={index} />
        ))}
      </>
    )
  }