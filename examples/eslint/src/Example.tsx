// Example component with straight quotes that the ESLint rule will flag.
// Run `pnpm lint` to see the warnings, or `pnpm lint --fix` to auto-convert.

export function WelcomeMessage() {
  return (
    <div>
      <h1>“Welcome to our app!”</h1>
      <p>We’re glad you’re here. It’s going to be great!</p>
      <p>As the saying goes, “The best time to start is now.”</p>
    </div>
  );
}

export function FormExample() {
  return (
    <form>
      <input
        type="text"
        placeholder="Enter your partner’s name"
        title="This field is required"
        aria-label="Partner’s name input"
      />
      <input
        type="email"
        placeholder="Enter your email address"
        alt="Email field"
      />
      <button type="submit">Submit</button>
    </form>
  );
}

export function AccessibilityExample() {
  return (
    <div>
      <img src="/logo.png" alt="Company’s official logo" />
      <span aria-label="Click here to see today’s deals">Deals</span>
      <div title="This item’s price may vary">$19.99</div>
    </div>
  );
}

// Props that should NOT be converted (not user-facing)
export function IgnoredPropsExample() {
  return (
    <div
      className="it's-a-class"
      id="user's-section"
      data-testid="partner's-form"
    >
      <a href="/user's/profile">Profile</a>
    </div>
  );
}
