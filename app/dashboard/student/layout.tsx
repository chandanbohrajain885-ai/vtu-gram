import BottomNavShell from './_components/BottomNavShell'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <BottomNavShell />
      {/* offset for desktop sidebar + mobile bottom bar */}
      <div className="sm:pl-56 pb-20 sm:pb-0">
        {children}
      </div>
    </div>
  )
}
