export default function Loading() {
  // Stack uses React Suspense, which will render this page while user data is being fetched.
  // See: https://nextjs.org/docs/app/api-reference/file-conventions/loading
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl text-white mb-2">Loading...</h2>
        <p className="text-slate-400">Preparing your Tarot TCG experience</p>
      </div>
    </div>
  );
}
