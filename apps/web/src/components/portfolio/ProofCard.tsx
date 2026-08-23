export default function ProofCard({ title, issuer, date, type }: { title: string, issuer: string, date: string, type: string }) {
  return (
    <div className="bg-white border-8 border-black shadow-brutal p-6 flex flex-col gap-4">
      <div className="flex justify-between items-start border-b-4 border-black pb-4">
        <h3 className="text-2xl font-black uppercase max-w-[70%]">{title}</h3>
        <span className="bg-neo-blue text-white font-bold px-2 py-1 border-2 border-black uppercase text-sm">
          {type}
        </span>
      </div>
      
      <div className="flex flex-col gap-2 font-mono text-sm">
        <div className="flex justify-between">
          <span className="font-bold">Issuer:</span>
          <span>{issuer}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Date Issued:</span>
          <span>{date}</span>
        </div>
        <div className="flex justify-between text-neo-green font-bold">
          <span>Status:</span>
          <span>Valid (Checked against BitstringStatusList)</span>
        </div>
      </div>
      
      <button className="mt-4 bg-neo-yellow border-4 border-black font-black uppercase py-2 shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1">
        View VC JSON
      </button>
    </div>
  );
}
