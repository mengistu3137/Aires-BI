export function LandingFooter() {
  return (
    <footer id="footer" className="border-t border-primary-600 bg-primary-700 py-10 text-white/80">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-lg font-semibold text-white">Yemi</p>
          <p className="mt-2 max-w-md text-sm text-white/70">
            SaaS operating system for restaurants, bakeries, and pharmacies to run operations, staff
            workflow, and business analytics from one place.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#footer" className="hover:text-white">
            Contact
          </a>
          <a href="#how-it-works" className="hover:text-white">
            About
          </a>
        </div>
      </div>
    </footer>
  )
}
