export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full p-8 bg-white shadow-xl rounded-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Career PathFinder Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          Welcome to your AI-powered personalized learning journey.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">Current Goal</h2>
            <p className="text-gray-500 italic">No active goal set. (TODO: integrate intent parser)</p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">Next Milestone</h2>
            <p className="text-gray-500 italic">Generate a path to see your next steps.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
