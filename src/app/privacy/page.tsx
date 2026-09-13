import { Brand, Footer } from "@/components/brand";
export default function Privacy() {
  return (
    <>
      <header className="public-nav">
        <Brand />
      </header>
      <main className="prose">
        <span className="eyebrow">PRIVACY</span>
        <h1>Your research stays yours.</h1>
        <p>
          Lens Atlas stores your verified email, signup and login times, access
          approval, private research parameters, and minimal activity events.
          Your research history is accessible only through your session. Owners
          can see user accounts and aggregate application adoption.
        </p>
        <h2>Authentication</h2>
        <p>
          Verification emails are delivered through Resend when configured.
          Codes expire after ten minutes. We store keyed code hashes and hashed
          session tokens. A necessary HTTP-only cookie keeps you signed in for a
          fixed seven days. Signing out invalidates the current device session
          immediately.
        </p>
        <h2>Research and service providers</h2>
        <p>
          Stored research parameters are sent to Fomolens only after an explicit
          approved action. We do not persist raw upstream research responses.
          Example mode makes no upstream research requests. Shared links contain
          only the selected handles and display window; anyone with a link can
          see those selections.
        </p>
        <h2>Retention and deletion</h2>
        <p>
          Research operation metadata and activity are retained for 90 days.
          Expired authentication records and obsolete rate limits are cleaned
          daily. User records remain until deletion. Unresolved accounting
          retains only minimal accounting identifiers and amounts. Ask the
          service operator to delete your account using the documented owner
          command.
        </p>
        <p>
          Local backup copies expire after seven daily backups. The operator
          must configure an off-server encrypted backup retention policy before
          production launch and provide a contact address. Deleted data may
          persist in retained backups until they expire; deletion records must
          be reapplied before any restored database serves users.
        </p>
        <h2>No advertising analytics</h2>
        <p>
          We do not use advertising trackers or include raw handles in aggregate
          activity events. IP identifiers used for abuse prevention are hashed
          with a separate secret. Infrastructure providers may process
          connection metadata under the operator’s deployment configuration.
        </p>
      </main>
      <Footer />
    </>
  );
}
