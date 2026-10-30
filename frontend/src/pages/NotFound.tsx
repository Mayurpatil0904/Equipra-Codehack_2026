import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-background">
      <div className="text-7xl mb-6">🔌</div>
      <h1 className="font-display text-4xl font-bold text-foreground mb-3">404 — Page Not Found</h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        Go Back Home
      </Link>
    </div>
  );
}
