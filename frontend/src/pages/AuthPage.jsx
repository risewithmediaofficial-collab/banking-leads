import { useState } from 'react'

function AuthPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin({ email, password })
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-panel-left">
        <div className="auth-logo-block">
          <div className="auth-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="auth-logo-text">
            Ramjayam Associates
            <span>Property Valuation Brokers</span>
          </div>
        </div>

        <div className="auth-headline">
          <h1>Bank Lead<br />Management<br />Platform</h1>
          <p>
            A complete property verification and valuation management system for field executives, bank leads, technical reports, and vendor billing.
          </p>
        </div>

        <div className="auth-features">
          {[
            'Manage bank leads from Ujjivan & Nivara',
            'Assign tasks to field executives',
            'Upload site photos & generate reports',
            'Export technical reports & vendor bills',
          ].map((feature) => (
            <div key={feature} className="auth-feature-item">
              <div className="auth-feature-dot" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-panel-right">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <h2>Welcome back</h2>
            <p>Sign in with your admin or field executive credentials to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoFocus
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-password-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error ? (
              <div className="auth-error">⚠ {error}</div>
            ) : null}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
