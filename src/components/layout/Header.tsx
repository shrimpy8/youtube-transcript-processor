import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

/**
 * Header component with logo and theme toggle
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl ml-auto mr-auto xl:ml-[10%] xl:mr-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center">
        <div className="mr-4 flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <span className="font-bold text-xl"><span className="sm:hidden">YT Transcript</span><span className="hidden sm:inline">YouTube Podcast Transcript Processor</span></span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}



