export default function AdminWarRoom() {
  const drives = [
    { company: 'Acme Corp', role: 'Backend SWE', date: 'Next Tuesday', nodes: ['REST API Design', 'Postgres'] },
    { company: 'Global Tech', role: 'Data Analyst', date: 'In 3 Weeks', nodes: ['SQL Joins', 'Pandas'] },
  ];

  return (
    <div className="min-h-screen bg-neo-bg p-8 flex flex-col gap-8">
      <header className="border-b-8 border-black pb-4">
        <h1 className="text-4xl font-black uppercase">TPO War Room</h1>
        <p className="text-xl font-bold mt-2">Map company hiring drives to cohort readiness.</p>
      </header>

      <main className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white border-8 border-black shadow-brutal p-8">
          <h2 className="text-3xl font-black uppercase border-b-4 border-black pb-4 mb-6">Upcoming Drives</h2>
          <div className="flex flex-col gap-6">
            {drives.map((d, idx) => (
              <div key={idx} className="bg-neo-bg border-4 border-black p-4 shadow-brutal-active">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-black uppercase">{d.company}</h3>
                  <span className="bg-neo-red text-white px-2 py-1 border-2 border-black font-bold uppercase">{d.date}</span>
                </div>
                <p className="font-bold text-lg mb-2">Target Role: {d.role}</p>
                <div className="flex gap-2">
                  {d.nodes.map(n => (
                    <span key={n} className="bg-neo-blue text-white px-2 py-1 text-sm font-bold uppercase border-2 border-black">{n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neo-yellow border-8 border-black shadow-brutal p-8">
          <h2 className="text-3xl font-black uppercase border-b-4 border-black pb-4 mb-6">Cohort Aggregation</h2>
          <div className="flex flex-col gap-4 text-xl font-bold">
            <p className="bg-white border-4 border-black p-4">
              <strong>12</strong> learners are ready for Acme Corp (mastered all required nodes).
            </p>
            <p className="bg-white border-4 border-black p-4">
              <strong>4</strong> learners are 1 node away. (Send push notification?)
            </p>
            <button className="bg-black text-white px-6 py-4 mt-4 uppercase font-black hover:bg-gray-800 border-4 border-black shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1">
              Notify Cohort
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
