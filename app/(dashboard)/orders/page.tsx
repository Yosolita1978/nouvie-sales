export default function OrdersPage() {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Orders</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + New Order
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">
            Order management will go here...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Soon you&apos;ll create orders for your 614 customers!
          </p>
        </div>
      </div>
    )
  }