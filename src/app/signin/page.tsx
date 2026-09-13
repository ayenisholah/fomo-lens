import { Suspense } from "react";
import { Brand, Footer } from "@/components/brand";
import { Signin } from "@/components/signin";
export default function Page() {
  return (
    <>
      <header className="public-nav">
        <Brand />
      </header>
      <main className="auth-wrap">
        <Suspense fallback={<p>Loading sign-in…</p>}>
          <Signin />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
