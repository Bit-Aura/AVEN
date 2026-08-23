export default function MentorDashboard() {
  const learners = [
    { name: 'Alice Chen', risk: 'High', reason: 'Failed API Design 3 times', status: 'Blocked' },
    { name: 'Bob Smith', risk: 'Medium', reason: 'Behind time budget', status: 'Active' },
    { name: 'Charlie Doe', risk: 'Low', reason: 'On track', status: 'Active' },
  ];

  return (
    <div className="min-h-screen bg-neo-bg p-8 flex flex-col gap-8">
      <header className="border-b-8 border-black pb-4">
        <h1 className="text-4xl font-black uppercase">Mentor Load Balancer</h1>
        <p className="text-xl font-bold mt-2">Risk-ranked learner roster.</p>
      </header>

      <main className="bg-white border-8 border-black shadow-brutal p-8">
        <table className="w-full text-left">
          <thead className="border-b-4 border-black text-xl font-black uppercase">
            <tr>
              <th className="pb-4">Learner</th>
              <th className="pb-4">Risk Level</th>
              <th className="pb-4">Reason</th>
              <th className="pb-4">Action</th>
            </tr>
          </thead>
          <tbody className="text-lg font-bold">
            {learners.map((l, idx) => (
              <tr key={idx} className="border-b-2 border-gray-300">
                <td className="py-4">{l.name}</td>
                <td className="py-4">
                  <span className={`px-2 py-1 border-2 border-black text-white uppercase font-black ${
                    l.risk === 'High' ? 'bg-neo-red' : 
                    l.risk === 'Medium' ? 'bg-neo-yellow text-black' : 'bg-neo-green'
                  }`}>
                    {l.risk}
                  </span>
                </td>
                <td className="py-4">{l.reason}</td>
                <td className="py-4">
                  <button className="bg-black text-white px-4 py-2 uppercase font-black hover:bg-gray-800 border-2 border-black">
                    Intervene
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
