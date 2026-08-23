import ProofCard from '../../../../components/portfolio/ProofCard';

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-neo-bg p-8 flex flex-col gap-8">
      <header className="border-b-8 border-black pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase">Your Proof Portfolio</h1>
          <p className="text-xl font-bold mt-2 max-w-2xl">
            Aggregate verifiable credentials and assessment history. Stop saying you know it, and prove it.
          </p>
        </div>
        <button className="bg-black text-white font-black uppercase px-6 py-3 border-4 border-black hover:bg-gray-800">
          Export as JSON-LD
        </button>
      </header>
      
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ProofCard 
          title="HTTP Methods & Status Codes" 
          issuer="PathFinder EIKG Core" 
          date="2023-10-01" 
          type="Micro-Assessment" 
        />
        <ProofCard 
          title="Relational Database Design" 
          issuer="PathFinder EIKG Core" 
          date="2023-10-15" 
          type="Micro-Assessment" 
        />
        <ProofCard 
          title="Python FastAPI Backend" 
          issuer="PathFinder EIKG Advanced" 
          date="2023-11-20" 
          type="Capstone Project" 
        />
      </main>
    </div>
  );
}
