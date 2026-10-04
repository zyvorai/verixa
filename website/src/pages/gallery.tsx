import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './gallery.module.css';

type Shot = {
  src: string;
  caption: string;
};

const TOUR: Shot[] = [
  {src: '/07-login.png', caption: 'Sign in'},
  {src: '/00-overview.png', caption: 'Overview'},
  {src: '/01-rehearsals.png', caption: 'Rehearsals'},
  {src: '/02-evidence.png', caption: 'Evidence drawer'},
  {src: '/03-scenarios.png', caption: 'Scenario library'},
  {src: '/04-fault-studio.png', caption: 'Fault studio'},
  {src: '/05-compare.png', caption: 'Compare versions'},
  {src: '/06-dark.png', caption: 'Dark theme'},
];

function ShotCard({shot}: {shot: Shot}) {
  const src = useBaseUrl(shot.src);
  return (
    <figure className={styles.shot}>
      <a href={src} target="_blank" rel="noreferrer">
        <img src={src} alt={shot.caption} loading="lazy" />
      </a>
      <figcaption>{shot.caption}</figcaption>
    </figure>
  );
}

export default function Gallery(): ReactNode {
  const hero = useBaseUrl('/hero-overview.png');
  return (
    <Layout
      title="Gallery"
      description="A walkthrough of the Verixa console, captured from a running server with the bundled demo data.">
      <header className={styles.header}>
        <div className="container">
          <Heading as="h1">Product tour</Heading>
          <p>
            Every screenshot below is captured from a running Verixa server
            with the bundled demo data — not a mockup.
          </p>
        </div>
      </header>
      <main className="container">
        <div className={styles.demo}>
          <img src={hero} alt="Verixa overview" />
          <p className={styles.caption}>
            Overview: pass-rate ring, recorded rehearsals, the propose → rehearse
            → verify flow, recent runs and the verdict trend.
          </p>
        </div>
        <div className={styles.grid}>
          {TOUR.map((shot) => (
            <ShotCard key={shot.src} shot={shot} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
