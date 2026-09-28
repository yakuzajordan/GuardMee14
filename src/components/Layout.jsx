import Navbar from './Navbar';
import MobileNav from './MobileNav';

export default function Layout({ children, fullWidth = false }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        className={`flex-1 animate-fade-in-up ${
          fullWidth ? '' : 'max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8'
        } mobile-nav-padding`}
      >
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
