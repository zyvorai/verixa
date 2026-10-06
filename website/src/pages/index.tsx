import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import Reveal from '@site/src/components/Reveal';

import styles from './index.module.css';

const DEMO_URL =
  'https://zyvor.dev/schedule?utm_source=github&utm_medium=verixa&utm_campaign=pages_hero';
const POC_URL =
  'https://zyvor.dev/poc?utm_source=github&utm_medium=verixa&utm_campaign=pages_hero';
const QUICKSTART = '/docs/getting-started/quickstart';

function HomepageHeader() {
  const hero = useBaseUrl('/hero-overview.png');
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>AI agent rehearsal · Open source · Apache-2.0</p>
            <Heading as="h1" className="hero__title">
              Rehearse every action.
              <br />
              Ship with evidence.
            </Heading>
            <p className="hero__subtitle">
              Know what your agent will do before it touches production. Verixa
              runs your AI agent's tool calls against simulated systems, breaks
              them on purpose and checks the final state. When a new model,
              prompt or policy does worse, the release is blocked, with the
              evidence to show why.
            </p>
            <div className={styles.buttons}>
              <Link className="button button--secondary button--lg" href={DEMO_URL}>
                Book a demo
              </Link>
              <Link
                className="button button--outline button--lg button--secondary"
                href={POC_URL}>
                Start a 30-day PoC
              </Link>
              <Link
                className="button button--outline button--lg button--secondary"
                to={QUICKSTART}>
                Quickstart
              </Link>
            </div>
            <ul className={styles.wall}>
              <li>Apache-2.0</li>
              <li>Zero runtime dependencies</li>
              <li>Simulated tools only</li>
              <li>Five fault types</li>
              <li>Exit code 3 release gate</li>
              <li>OpenAI-compatible models</li>
            </ul>
          </div>
          <div className={styles.heroMedia}>
            <img
              src={hero}
              alt="Verixa console overview — pass rate, verdict trend and recent rehearsals"
            />
            <p className={styles.heroMediaCaption}>
              Every rehearsal ends in a verdict on what actually changed.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

const OUTCOMES: [string, string][] = [
  [
    'Grade the outcome.',
    'Pass or fail comes from the final state of balances, approvals and deployments, not from how convincing the reply sounds.',
  ],
  [
    'Break it on purpose.',
    'Inject a timeout, rate limit or expired credential at an exact tool call, before or after the commit.',
  ],
  [
    'Block the regression.',
    'Compare versions on the same scenario revision. A failing candidate exits 3 and stops the release in CI.',
  ],
  [
    'Keep the evidence.',
    'Every argument, result, policy denial and state change is recorded in an event hash chain you can export and replay.',
  ],
];

function Outcomes() {
  return (
    <section className={styles.outcomes}>
      <div className="container">
        <Reveal className={styles.outcomeGrid}>
          {OUTCOMES.map(([kicker, body]) => (
            <div key={kicker} className={styles.outcome}>
              <p className={styles.kicker}>{kicker}</p>
              <p className={styles.outcomeBody}>{body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

type Capability = {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  shot: string;
  alt: string;
  link: {label: string; to: string};
};

const CAPABILITIES: Capability[] = [
  {
    eyebrow: 'Simulate stateful systems',
    title: "A stateful world your agent can't break for real.",
    body: 'Orders, refunds, approvals, support tickets and deployments behave like the real thing: policy, idempotency keys and balances included. Nothing ever reaches a payment gateway, ticket system or cluster.',
    points: [
      'Ten executable scenarios, from refund success to bounded deployment scale',
      'Import or edit scenarios as JSON; the server validates every fixture',
      'The engine has no networking and no subprocess execution',
    ],
    shot: '/03-scenarios.png',
    alt: 'Verixa scenario library with bundled fixtures and JSON import',
    link: {label: 'Scenarios', to: '/docs/core-concepts/scenarios'},
  },
  {
    eyebrow: 'Inject faults',
    title: 'The failures that cause real incidents, placed exactly.',
    body: 'Pick a tool and an occurrence, choose a fault, and run it. A timeout before the commit and a response lost after it look identical to the agent; Verixa tests both.',
    points: [
      'timeout, commit_timeout, rate_limit, malformed and expired_credentials',
      'Faults land on an exact tool invocation, before or after commit',
      'A step-by-step fault builder in the console creates new scenarios',
    ],
    shot: '/04-fault-studio.png',
    alt: 'Verixa fault studio with a step-by-step fault builder',
    link: {label: 'Fault injection', to: '/docs/core-concepts/scenarios'},
  },
  {
    eyebrow: 'Verify final state',
    title: 'Did the refund happen once? Verixa checks.',
    body: 'Assertions run against the final simulated state. Approvals must cover the exact order and amount, refund balances prevent over-refunding, and a missing assertion path fails.',
    points: [
      'Stateful refund ledger with idempotency checks',
      'Approval records matched to the exact order and amount',
      'Tool policy enforced even when the agent asks for an unauthorized tool',
    ],
    shot: '/02-evidence.png',
    alt: 'Verixa evidence drawer showing outcome checks and the action timeline',
    link: {label: 'Architecture', to: '/docs/core-concepts/architecture'},
  },
  {
    eyebrow: 'Compare versions · release gate',
    title: 'Ship the new model only when it does no worse.',
    body: "Compare a baseline and a candidate on the same scenario revision, so a changed expectation can't pass for an improvement. Any failing candidate blocks the gate.",
    points: [
      'Runs store scenario hashes; comparison requires them to match',
      'Exit code 3 on a failed outcome or regression',
      'JUnit reports for any CI system',
    ],
    shot: '/05-compare.png',
    alt: 'Verixa version comparison with the release gate blocking a regression',
    link: {label: 'Console guide', to: '/docs/getting-started/console'},
  },
  {
    eyebrow: 'Evidence and replay',
    title: 'A record of what the agent actually did.',
    body: 'Each rehearsal records tool arguments, results, policy denials, state diffs and an event hash chain. Export it, verify it, or replay the exact action sequence in fresh state.',
    points: [
      'Evidence and action-trace export as JSON',
      'Chain verification detects local edits to the event sequence',
      'Deterministic replay of a recorded action sequence',
    ],
    shot: '/01-rehearsals.png',
    alt: 'Verixa rehearsals list with search, filters and export',
    link: {label: 'Security model', to: '/docs/security'},
  },
  {
    eyebrow: 'Bring any model',
    title: 'Bring the model you already run.',
    body: 'Point Verixa at any OpenAI-compatible chat-completions endpoint with tool calling. The model proposes calls; Verixa executes them against the simulated world.',
    points: [
      'Model, replay and scripted reference adapters, or your own Python adapter',
      'Model network calls are opt-in, from the command line',
      'Token usage recorded when the endpoint reports it',
    ],
    shot: '/06-dark.png',
    alt: 'Verixa overview in the dark theme',
    link: {label: 'Agent adapters', to: '/docs/core-concepts/agents'},
  },
];

function CapabilityRow({cap, flip}: {cap: Capability; flip: boolean}) {
  const src = useBaseUrl(cap.shot);
  return (
    <Reveal className={clsx(styles.capRow, flip && styles.capRowFlip)}>
      <div>
        <p className={styles.eyebrow}>{cap.eyebrow}</p>
        <Heading as="h3" className={styles.capTitle}>
          {cap.title}
        </Heading>
        <p className={styles.capBody}>{cap.body}</p>
        <ul className={styles.capList}>
          {cap.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <Link to={cap.link.to}>{cap.link.label} →</Link>
      </div>
      <a href={src} target="_blank" rel="noreferrer" className={styles.capShot}>
        <img src={src} alt={cap.alt} loading="lazy" />
      </a>
    </Reveal>
  );
}

function CapabilityTour() {
  return (
    <section className={styles.tour}>
      <div className="container">
        <Reveal className="text--center">
          <p className={styles.eyebrow}>Meet Verixa</p>
          <Heading as="h2" className={styles.sectionHeading}>
            Test what your agent does, not just what it says.
          </Heading>
        </Reveal>
        {CAPABILITIES.map((cap, i) => (
          <CapabilityRow key={cap.eyebrow} cap={cap} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

const LOOP = ['Propose', 'Policy check', 'Inject fault', 'Apply', 'Assert', 'Verdict'];

function RehearsalLoop() {
  return (
    <section className={styles.loopSection}>
      <div className="container">
        <Reveal className="text--center">
          <p className={styles.eyebrow}>The rehearsal loop</p>
          <Heading as="h2" className={styles.sectionHeading}>
            Every tool call, rehearsed end to end.
          </Heading>
          <p className={styles.lede}>
            Your agent proposes the next action. Verixa checks it against policy,
            injects the fault you configured, applies the change to simulated
            state and, when the agent stops, decides the verdict from what
            changed.
          </p>
          <ol className={styles.loop} aria-label="Rehearsal loop">
            {LOOP.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <ul className={styles.loopNotes}>
            <li>One engine for the command line and the console, with the same assertions and store.</li>
            <li>Model adapters can't mutate state directly; every change goes through policy.</li>
            <li>Each step records arguments, result, state diff and an event hash.</li>
            <li>Finished runs are saved as immutable records, ready to compare or export.</li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

const USE_CASES: [string, string, string][] = [
  [
    '↺',
    'Refunds that happen once',
    'A response lost after the commit tempts the agent to retry. Verixa shows whether the refund went through exactly once.',
  ],
  [
    '✓',
    'Approvals that match',
    'An approval only counts when it covers the exact order and amount. Approving one refund never authorizes another.',
  ],
  [
    '⚠',
    'Prompt injection, contained',
    'A support ticket tells the agent to scale production. Policy blocks it, and the final deployment state proves it.',
  ],
  [
    '⇅',
    'Safer infrastructure changes',
    "Rehearse bounded deployment scaling so an agent can't push replicas past the limit you set.",
  ],
  [
    '⇄',
    'Model and prompt upgrades',
    'Run the new version against the same scenarios. If it regresses, CI fails before anyone ships it.',
  ],
  [
    '◎',
    'Flaky APIs and expired keys',
    'See how the agent copes with rate limits, malformed results and expired credentials before your users do.',
  ],
];

function UseCases() {
  return (
    <section className={styles.useCases}>
      <div className="container">
        <Reveal>
          <div className="text--center">
            <p className={styles.eyebrow}>Do more with Verixa</p>
            <Heading as="h2" className={styles.sectionHeading}>
              Catch the failures a transcript hides.
            </Heading>
          </div>
          <div className={styles.useGrid}>
            {USE_CASES.map(([glyph, title, desc]) => (
              <div key={title} className={styles.useCard}>
                <span className={styles.useGlyph} aria-hidden>
                  {glyph}
                </span>
                <strong>{title}</strong>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const COMPARISON: [string, string, string][] = [
  [
    'What is tested',
    'Prompts and model replies across test cases',
    "The agent's tool calls, executed against stateful simulated systems",
  ],
  [
    'Pass or fail signal',
    'Assertions on the reply, often graded by another model',
    'Assertions on final state: balances, approvals, deployments',
  ],
  [
    'Failure injection',
    'Tool failures come from your own mocks or harness',
    'Five built-in fault types at an exact tool call, before or after commit',
  ],
  [
    'Version comparison',
    'Side-by-side outputs for prompts and providers',
    'Same-scenario-revision comparison, with exit code 3 on regression',
  ],
  [
    'Adversarial input',
    "Red-teaming of the model's replies",
    'Injection through a simulated support ticket, checked against final state',
  ],
  [
    'Evidence',
    'Eval results and a results viewer',
    'Recorded actions, state diffs, an event hash chain and deterministic replay',
  ],
];

function WhyVerixa() {
  return (
    <section className={styles.why}>
      <div className="container">
        <Reveal>
          <div className="text--center">
            <p className={styles.eyebrow}>Why Verixa</p>
            <Heading as="h2" className={styles.sectionHeading}>
              Prompt evals grade the reply. Verixa grades the outcome.
            </Heading>
            <p className={styles.lede}>
              An agent can sound right and still change the wrong record, retry a
              committed payment or cross a permission boundary.
            </p>
          </div>
          <div className={styles.tblWrap}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th scope="col"> </th>
                  <th scope="col">Typical prompt/LLM eval tool</th>
                  <th scope="col" className={styles.tblLead}>
                    Verixa
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, typical, ours]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{typical}</td>
                    <td className={styles.tblLead}>{ours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={clsx(styles.lede, styles.note)}>
            Prompt eval tools are the right fit for grading replies across many
            providers. Verixa is for rehearsing the actions an agent takes,
            against simulated tool state.
          </p>
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
            <p className={styles.eyebrow}>Get started</p>
            <Heading as="h2" className={styles.sectionHeading}>
              Rehearsing in minutes.
            </Heading>
            <p>
              Python 3.11+, no runtime dependencies, no frontend build and no API
              key for the demo. The demo seeds eleven simulator runs: ten
              reference runs and one known regression, from scripted fixtures.
            </p>
            <p>
              Point it at any OpenAI-compatible tool-calling model, then gate CI
              on exit codes: <code>0</code> passed, <code>1</code> error,{' '}
              <code>3</code> failed outcome or regression.
            </p>
            <Link to={QUICKSTART}>Read the quickstart →</Link>
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
              detects edits; it is not a signature. Model execution is
              CLI-only in 0.1.
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
            <img
              src="https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg"
              alt="Zero runtime dependencies"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className={styles.enterprise}>
      <div className="container text--center">
        <Reveal>
          <Heading as="h2" className={styles.sectionHeading}>
            Rehearse your agents before they touch production.
          </Heading>
          <p className={styles.enterpriseCopy}>
            Run the demo in one command, then point Verixa at your own model and
            gate your next release on outcomes. Zyvor Enterprise adds supported
            releases, deployment guidance and priority triage.
          </p>
          <div className={clsx(styles.buttons, styles.centerButtons)}>
            <Link className="button button--primary button--lg" href={DEMO_URL}>
              Book a demo
            </Link>
            <Link className="button button--outline button--primary button--lg" href={POC_URL}>
              Start a 30-day PoC
            </Link>
            <Link
              className="button button--outline button--primary button--lg"
              href="https://github.com/zyvorai/verixa">
              Star on GitHub
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
      title="Verixa — rehearse every action, ship with evidence"
      description="Stateful AI agent rehearsal and outcome verification: run tool calls against simulated systems, inject failures, check the final state and block regressions in CI. Apache-2.0.">
      <HomepageHeader />
      <main>
        <Outcomes />
        <CapabilityTour />
        <RehearsalLoop />
        <UseCases />
        <WhyVerixa />
        <Quickstart />
        <TrustBand />
        <FinalCTA />
      </main>
    </Layout>
  );
}
