export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <span className="text-2xl">🎨</span>
            <span className="text-white font-semibold">Drawing App</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Drawing App. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
