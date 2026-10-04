import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import FeatureHighlights from '@site/src/components/FeatureHighlights';
import ScreenshotStrip from '@site/src/components/ScreenshotStrip';
import Reveal from '@site/src/components/Reveal';

import styles from './index.module.css';

function HomepageHeader() {
  const hero = useBaseUrl('/hero-overview.png');
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>Open source · Apache-2.0</p>
            <Heading as="h1" className="hero__title">
              Rehearse every action.
              <br />
              Ship with evidence.
            </Heading>
            <p className="hero__subtitle">
              Stateful rehearsal and outcome verification for AI agents. Run
              your agent's tool calls against simulated systems, inject the
              failures that matter, verify the final state — and block a
              release when a new model, prompt or policy regresses.
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--secondary button--lg"
                to="/docs/getting-started/quickstart">
                Get Started
              </Link>
              <Link
                className="button button--outline button--lg button--secondary"
                to="/gallery">
                Product tour
              </Link>
              <Link
                className="button button--outline button--lg button--secondary"
                to="https://github.com/zyvorai/verixa">
                View on GitHub
              </Link>
            </div>
          </div>
          <div className={styles.heroMedia}>
            <img src={hero} alt="Verixa console overview — pass rate, verdict trend and recent rehearsals" />
            <p className={styles.heroMediaCaption}>
              The Verixa console, captured from a running server with demo data.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProblemStatement() {
  return (
    <section className={styles.problem}>
      <div className="container">
        <Reveal className="row">
          <div className="col col--8 col--offset-2 text--center">
            <Heading as="h2" className={styles.sectionHeading}>
              The answer sounded right. The refund happened twice.
            </Heading>
            <p>
              An agent can give a convincing final message and still change the
              wrong object, retry a payment that already committed, ignore a
              permission boundary, or follow instructions hidden in a support
              ticket. Grading the last sentence misses all of it.
            </p>
            <p>
              Verixa grades <strong>actions and outcomes</strong>. Every tool call
              runs against a stateful simulated world with real policy, real
              idempotency and real balances. Faults land exactly where you put
              them — before or after the commit — and assertions check what the
              world looks like when the agent is done.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const QUESTIONS: [string, string][] = [
  ['Did the refund happen once?', 'Stateful ledger, balance and idempotency keys'],
  ['Did a timeout hide a successful commit?', 'Faults injected before or after the simulated commit'],
  ['Did approval cover the actual request?', 'Exact order and amount matching'],
  ['Did ticket text change infrastructure?', 'Tool policy and final deployment state'],
  ['Did the new version regress?', 'Same-revision comparison and a release gate'],
];

function Questions() {
  return (
    <section className={styles.questions}>
      <div className="container">
        <Reveal>
          <Heading as="h2" className={clsx(styles.sectionHeading, 'text--center')}>
            Questions a transcript can't answer
          </Heading>
          <div className={styles.qGrid}>
            {QUESTIONS.map(([q, a]) => (
              <div key={q} className={styles.qCard}>
                <strong>{q}</strong>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Quickstart() {
  return (
    <section className={styles.quickstart}>
      <div className="container">
        <Reveal className={styles.quickGrid}>
          <div>
            <Heading as="h2" className={styles.sectionHeading}>
              Running in one command
            </Heading>
            <p>
              Python 3.11+, no runtime dependencies, no frontend build and no API
              key for the demo. The demo seeds eleven real simulator runs —
              ten reference runs and one known regression.
            </p>
            <p>
              Gate CI on exit codes: <code>0</code> passed, <code>1</code> error,{' '}
              <code>3</code> failed outcome or regression.
            </p>
            <Link to="/docs/getting-started/quickstart">Read the quickstart →</Link>
          </div>
          <div>
            <CodeBlock language="bash">
              {`git clone https://github.com/zyvorai/verixa && cd verixa
VERIXA_TOKEN=Admin@321 python3 -m verixa serve --demo
# open http://127.0.0.1:8788 — sign in as admin / Admin@321

python3 -m verixa run all --junit artifacts/reference.xml
python3 -m verixa run ticket-injection --agent regression  # exits 3`}
            </CodeBlock>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TrustBand() {
  return (
    <section className={styles.trust}>
      <div className="container">
        <Reveal className={styles.trustGrid}>
          <div>
            <Heading as="h3" className={styles.sectionHeading}>
              Open, and honest about its limits
            </Heading>
            <p>
              Apache-2.0. CI on every push runs the Python suite on 3.11–3.13, a
              console-to-API harness, real Chromium tests and a container build.
              Evidence is labelled <code>simulated-tool-state</code>: Verixa
              proves what your agent did against simulated systems, not that it
              will behave identically in production. The event hash chain
              detects edits; it is not a signature.
            </p>
            <Link to="/docs/security">Read the security model →</Link>
          </div>
          <div className={styles.trustBadges}>
            <img
              src="https://github.com/zyvorai/verixa/actions/workflows/ci.yml/badge.svg"
              alt="CI status"
            />
            <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="Apache-2.0" />
            <img src="https://img.shields.io/badge/python-3.11%2B-blue.svg" alt="Python 3.11+" />
            <img src="https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg" alt="Zero runtime dependencies" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ContributeCTA() {
  return (
    <section className={styles.enterprise}>
      <div className="container text--center">
        <Reveal>
          <Heading as="h2" className={styles.sectionHeading}>
            Bring your own scenarios
          </Heading>
          <p className={styles.enterpriseCopy}>
            New simulated tools, fault types, agent adapters and scenario packs
            are all welcome. Start with an issue or a pull request.
          </p>
          <div className={clsx(styles.buttons, styles.centerButtons)}>
            <Link className="button button--primary button--lg" to="https://github.com/zyvorai/verixa">
              Star on GitHub
            </Link>
            <Link
              className="button button--outline button--primary button--lg"
              to="https://github.com/zyvorai/verixa/blob/main/CONTRIBUTING.md">
              Contributing guide
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Verixa — stateful AI agent rehearsal and outcome verification"
      description="Test an AI agent's tool calls against simulated systems. Inject failures, verify final state, compare versions and block releases on regressions.">
      <HomepageHeader />
      <main>
        <ProblemStatement />
        <Questions />
        <Reveal>
          <FeatureHighlights />
        </Reveal>
        <Reveal>
          <ScreenshotStrip />
        </Reveal>
        <Quickstart />
        <TrustBand />
        <ContributeCTA />
      </main>
    </Layout>
  );
}
