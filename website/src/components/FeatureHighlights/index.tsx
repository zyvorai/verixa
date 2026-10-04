import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
  to: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Stateful simulated systems',
    description:
      'Orders, refunds, approvals, support tickets and deployments with real balances, idempotency keys and per-world state — never a production gateway, ticket system or cluster.',
    to: '/docs/core-concepts/architecture',
  },
  {
    title: 'Precise fault injection',
    description:
      'Timeouts, responses lost after commit, expired credentials, rate limits and malformed results — at an exact tool and invocation, before or after the simulated commit.',
    to: '/docs/core-concepts/scenarios',
  },
  {
    title: 'Policy that actually binds',
    description:
      'Allowed tools, refund limits and replica caps are enforced by the engine even when the agent asks for something else. Denials are recorded as violations.',
    to: '/docs/core-concepts/architecture',
  },
  {
    title: 'Outcome assertions',
    description:
      'Check the final world, not the transcript: refund count and amount, ticket status, replica count, call budget, violations. Missing paths fail.',
    to: '/docs/core-concepts/scenarios',
  },
  {
    title: 'Release gate',
    description:
      'Compare two runs of the same scenario revision. Any failing candidate or regressed assertion blocks the gate — in the console or with exit code 3 in CI.',
    to: '/docs/getting-started/quickstart',
  },
  {
    title: 'Evidence and replay',
    description:
      'Every run records arguments, results, denials, state diffs and a hash chain. Export evidence, export the action trace, and replay it against fresh state.',
    to: '/docs/core-concepts/architecture',
  },
  {
    title: 'Bring any model',
    description:
      'Any OpenAI-compatible tool-calling endpoint proposes calls; Verixa executes them against the simulated world. Network calls are opt-in, token usage is recorded.',
    to: '/docs/core-concepts/agents',
  },
  {
    title: 'A real console',
    description:
      'Netra-style sign-in, overview with pass-rate and verdict trend, an evidence drawer with an action timeline, a fault studio and version comparison.',
    to: '/gallery',
  },
  {
    title: 'Deploy anywhere',
    description:
      'Zero runtime dependencies. One script deploys over SSH as a hardened container, a K3s Helm release or a systemd service, with HTTPS and a session login.',
    to: '/docs/getting-started/deploy',
  },
];

function Feature({title, description, to}: FeatureItem) {
  return (
    <div className="col col--4">
      <Link to={to} className={styles.card}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </Link>
    </div>
  );
}

export default function FeatureHighlights(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
