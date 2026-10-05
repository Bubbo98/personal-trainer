import Spinner from './Spinner';

/** Full-page placeholder while a lazily loaded page arrives. */
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-live="polite">
    <Spinner size="lg" />
  </div>
);

export default PageLoader;
