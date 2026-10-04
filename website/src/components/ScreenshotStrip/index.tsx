import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type Shot = {
  src: string;
  alt: string;
};

const SHOTS: Shot[] = [
  {src: '/02-evidence.png', alt: 'Evidence drawer — outcome checks and action timeline'},
  {src: '/04-fault-studio.png', alt: 'Fault studio — step builder with live preview'},
  {src: '/05-compare.png', alt: 'Version comparison — release blocked'},
];

export default function ScreenshotStrip(): ReactNode {
  return (
    <section className={styles.strip}>
      <div className="container">
        <Heading as="h2" className="text--center">
          A real product, not a mockup
        </Heading>
        <p className="text--center">
          Captured from a running server with the bundled demo data.{' '}
          <Link to="/gallery">See the full tour →</Link>
        </p>
        <div className={styles.grid}>
          {SHOTS.map((shot) => (
            <ShotImage key={shot.src} shot={shot} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShotImage({shot}: {shot: Shot}) {
  const src = useBaseUrl(shot.src);
  return (
    <Link to="/gallery" className={styles.frame}>
      <img src={src} alt={shot.alt} loading="lazy" />
    </Link>
  );
}
