import Head from 'next/head';
import LeadForm from '../components/LeadForm';

export default function Home() {
  return (
    <>
      <Head>
        <title>Request a Free Roof Inspection</title>
        <meta name="description" content="Get a professional roofing estimate fast. Submit your inquiry and we'll be in touch within minutes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <span className="font-bold text-gray-900 text-xl">RoofPing</span>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="bg-blue-600 text-white py-10 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Get a Free Roof Inspection
            </h1>
            <p className="text-blue-100 text-lg">
              Storm damage? Leak? We respond fast — usually within minutes.
            </p>
            <div className="mt-4 flex justify-center gap-6 text-sm text-blue-100">
              <span>⚡ Fast response</span>
              <span>🔍 Free estimate</span>
              <span>🛡️ Licensed & insured</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <main className="flex-1 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Tell us about your roof
              </h2>
              <LeadForm />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-2xl mb-1">⚡</p>
                <p className="font-semibold text-gray-800 text-sm">Fast Response</p>
                <p className="text-gray-500 text-xs mt-1">Hear from us within minutes</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-2xl mb-1">💰</p>
                <p className="font-semibold text-gray-800 text-sm">Free Estimate</p>
                <p className="text-gray-500 text-xs mt-1">No obligation, no pressure</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-2xl mb-1">🏅</p>
                <p className="font-semibold text-gray-800 text-sm">Trusted Pros</p>
                <p className="text-gray-500 text-xs mt-1">Licensed, insured, and local</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-sm text-gray-400">
          <a
            href="https://roofping.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600 transition-colors"
          >
            Powered by RoofPing
          </a>
        </footer>
      </div>
    </>
  );
}
