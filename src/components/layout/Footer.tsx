/**
 * Footer component
 */
export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            YouTube Podcast Transcript Processor
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a
            href="/how-it-works.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            How It Works
          </a>
          <span>© {new Date().getFullYear()} YouTube Transcript Processor</span>
        </div>
      </div>
    </footer>
  )
}





