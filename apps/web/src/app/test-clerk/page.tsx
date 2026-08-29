'use client';
export default function TestClerk() {
  return (
    <div>
      <h1>Test Clerk Key</h1>
      <pre>Key: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}</pre>
    </div>
  );
}
