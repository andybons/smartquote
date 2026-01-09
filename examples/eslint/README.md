# ESLint Smart Quotes Example

This example demonstrates the `smartquote` ESLint plugin for enforcing typographically correct quotes in JSX/TSX files.

## Setup

```bash
cd examples/eslint
pnpm install
```

## Run

```bash
# Check for straight quotes (will show errors)
pnpm lint

# Auto-fix straight quotes to smart quotes
pnpm lint:fix
```

## What It Does

The ESLint rule checks:

1. **JSX text content** - Text between JSX tags
   ```tsx
   <p>"Hello world"</p>  // Error: should be smart quotes
   ```

2. **User-facing props** - Only allowlisted props are checked:
   - `placeholder`, `title`, `alt`, `label`
   - `aria-label`, `aria-placeholder`, `aria-roledescription`, `aria-valuetext`

   ```tsx
   <input placeholder="Enter user's name" />  // Error: should be smart quotes
   ```

3. **Ignored props** - Non-user-facing props are NOT checked:
   - `className`, `id`, `href`, `data-*`, `key`, etc.

   ```tsx
   <div className="it's-fine" />  // OK: className is not user-facing
   ```

## Example Output

Before fix:
```
src/Example.tsx
   6:7   error  Use smart quotes instead of straight quotes  smartquote/smart-quotes
   7:7   error  Use smart quotes instead of straight quotes  smartquote/smart-quotes
  ...
```

After `pnpm lint:fix`, straight quotes in JSX text and user-facing props are converted to smart quotes (`\u201C` `\u201D` `\u2018` `\u2019`).
