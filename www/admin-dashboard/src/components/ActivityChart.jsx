// CSS/flex bar chart for weekly activity — no chart dependency.
export default function ActivityChart({ data }) {
  const max = Math.max(...data.flatMap((d) => [d.cards, d.comments]))

  return (
    <div>
      <div className="flex items-end gap-3 sm:gap-5 h-52">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end justify-center gap-1 flex-1">
              <div
                className="w-1/2 max-w-[18px] rounded-t bg-indigo-500 transition-all hover:bg-indigo-400"
                style={{ height: `${(d.cards / max) * 100}%` }}
                title={`${d.cards} cards`}
              />
              <div
                className="w-1/2 max-w-[18px] rounded-t bg-violet-300 dark:bg-violet-400/70 transition-all"
                style={{ height: `${(d.comments / max) * 100}%` }}
                title={`${d.comments} comments`}
              />
            </div>
            <span className="text-xs text-gray-400">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-5 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Cards
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-300 dark:bg-violet-400/70" /> Comments
        </span>
      </div>
    </div>
  )
}
