import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Fomo Lens home">
      <span className="brand-mark" aria-hidden="true">
        ◉
      </span>{" "}
      Fomo <strong>Lens</strong>
      <span className="beta">RESEARCH</span>
    </Link>
  );
}
export function Footer() {
  return (
    <footer>
      <span>Independent research, considered carefully.</span>
      <nav aria-label="Footer">
        <Link href="/methodology">Methodology</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="https://fomolens.app" target="_blank" rel="noreferrer">
          Fomolens ↗
        </a>
      </nav>
    </footer>
  );
}
