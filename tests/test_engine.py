import copy
import unittest
from verixa.agents import DemoAgent, ReplayAgent
from verixa.engine import World, ValidationError, compare, run, validate_scenario, verify_events
from verixa.scenarios import bundled

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.scenarios = {s['id']: s for s in bundled()}

    def test_reference_suite(self):
        for s in self.scenarios.values():
            with self.subTest(s=s['id']):
                r=run(s,DemoAgent())
                self.assertEqual(r['verdict'],'PASS',r)
                self.assertTrue(verify_events(r['events']))

    def test_regression_injection_caught(self):
        r=run(self.scenarios['ticket-injection'],DemoAgent('regression'))
        self.assertEqual(r['verdict'],'FAIL')
        self.assertEqual(r['final']['deployments']['payments']['replicas'],2)
        self.assertEqual(r['events'][1]['status'],'denied')

    def test_commit_timeout_stable_key(self):
        r=run(self.scenarios['refund-commit-timeout'],DemoAgent())
        self.assertEqual(len(r['final']['refunds']),1)
        self.assertTrue(r['events'][-1]['result']['deduplicated'])
        self.assertTrue(r['events'][1]['changes'])

    def test_commit_timeout_new_key_regression(self):
        r=run(self.scenarios['refund-commit-timeout'],DemoAgent('regression'))
        self.assertEqual(r['verdict'],'FAIL')
        self.assertEqual(r['events'][-1]['result']['error'],'invalid_amount')

    def test_approval_exact_amount(self):
        s=copy.deepcopy(self.scenarios['refund-approved']);w=World(s)
        w.call({'tool':'approval.request','args':{'order_id':'order-1042','amount_cents':15000}})
        r=w.call({'tool':'refund.create','args':{'order_id':'order-1042','amount_cents':25000,'idempotency_key':'a'}})
        self.assertEqual(r['error'],'policy_denied')
        self.assertFalse(w.state['refunds'])

    def test_idempotency_conflict(self):
        w=World(self.scenarios['refund-happy'])
        a={'tool':'refund.create','args':{'order_id':'order-1042','amount_cents':1000,'idempotency_key':'a'}}
        w.call(a);a['args']['amount_cents']=2000
        self.assertEqual(w.call(a)['error'],'idempotency_conflict')

    def test_balance_protection(self):
        w=World(self.scenarios['refund-happy'])
        for key in ['a','b']:
            result=w.call({'tool':'refund.create','args':{'order_id':'order-1042','amount_cents':8000,'idempotency_key':key}})
        self.assertEqual(result['error'],'invalid_amount')
        self.assertEqual(len(w.state['refunds']),1)

    def test_invalid_actions(self):
        invalid=[{'tool':'shell.exec','args':{}},{'tool':'deployment.scale','args':{'name':'payments','replicas':True}},{'tool':'deployment.scale','args':{'name':'payments','replicas':-1}},{'tool':'order.get','args':{'order_id':'x','extra':'y'}},[]]
        for a in invalid:
            with self.subTest(a=a), self.assertRaises(ValidationError):
                World(self.scenarios['refund-happy']).call(a)

    def test_bad_scenarios(self):
        mutations=[('id','../../escape'),('policy',{}),('assertions',[]),('faults',[{'tool':'order.get','occurrence':1,'kind':'commit_timeout'}]),('initial',{'orders':{'x':{'amount_cents':True,'customer':'a'}}})]
        for key,value in mutations:
            s=copy.deepcopy(self.scenarios['refund-happy']);s[key]=value
            with self.subTest(key=key), self.assertRaises(ValidationError):validate_scenario(s)

    def test_duplicate_fault_rejected(self):
        s=copy.deepcopy(self.scenarios['refund-timeout']);s['faults']*=2
        with self.assertRaises(ValidationError):validate_scenario(s)

    def test_nonfinite_json_rejected(self):
        s=copy.deepcopy(self.scenarios['refund-happy']);s['assertions'][0]['value']=float('nan')
        with self.assertRaises(ValidationError):validate_scenario(s)

    def test_hash_tampering(self):
        r=run(self.scenarios['refund-happy'],DemoAgent())
        r['events'][0]['result']['amount_cents']=5
        self.assertFalse(verify_events(r['events']))

    def test_hash_reordering(self):
        r=run(self.scenarios['refund-happy'],DemoAgent())
        self.assertFalse(verify_events(list(reversed(r['events']))))

    def test_replay(self):
        s=self.scenarios['refund-commit-timeout'];r=run(s,DemoAgent())
        actions=[{'tool':e['tool'],'args':e['args']} for e in r['events']]
        r2=run(s,ReplayAgent(actions))
        self.assertEqual(r2['final'],r['final'])
        self.assertEqual(r2['verdict'],'PASS')

    def test_state_isolation(self):
        s=self.scenarios['infra-scale'];r=run(s,DemoAgent())
        self.assertEqual(s['initial']['deployments']['payments']['replicas'],2)
        self.assertEqual(r['final']['deployments']['payments']['replicas'],3)

    def test_missing_assertion_fails(self):
        s=copy.deepcopy(self.scenarios['infra-scale']);s['assertions'][0]['path']='missing.x'
        self.assertEqual(run(s,DemoAgent())['verdict'],'FAIL')

    def test_boolean_is_not_numeric(self):
        s=copy.deepcopy(self.scenarios['infra-scale']);s['assertions'][0].update(path='metrics.last_call_succeeded',value=0,op='gte')
        self.assertEqual(run(s,DemoAgent())['verdict'],'FAIL')

    def test_step_limit(self):
        r=run(self.scenarios['infra-scale'],DemoAgent(),1)
        self.assertEqual(r['error'],'StepLimitExceeded')
        self.assertEqual(r['verdict'],'FAIL')

    def test_adapter_exception_is_sanitized(self):
        class Broken:
            name='broken'
            def next_action(self,*a):raise RuntimeError('SECRET-KEY')
        r=run(self.scenarios['infra-scale'],Broken())
        self.assertEqual(r['error'],'RuntimeError')
        self.assertNotIn('SECRET-KEY',str(r))

    def test_compare_regression(self):
        s=self.scenarios['ticket-injection']
        c=compare(run(s,DemoAgent()),run(s,DemoAgent('regression')))
        self.assertEqual(c['verdict'],'BLOCK')
        self.assertIn('No policy violations',c['regressions'])

    def test_compare_different_revision(self):
        s=self.scenarios['infra-scale'];r=run(s,DemoAgent());s=copy.deepcopy(s);s['task']+=' Changed.'
        with self.assertRaises(ValidationError):compare(r,run(s,DemoAgent()))

    def test_malformed_retried(self):
        r=run(self.scenarios['refund-malformed'],DemoAgent())
        self.assertEqual(r['verdict'],'PASS')
        self.assertEqual(r['events'][1]['status'],'fault')

    def test_zero_refund_rejected(self):
        w=World(self.scenarios['refund-happy'])
        self.assertEqual(w.call({'tool':'refund.create','args':{'order_id':'order-1042','amount_cents':0,'idempotency_key':'a'}})['error'],'invalid_amount')

    def test_optional_fields_normalized(self):
        s=copy.deepcopy(self.scenarios['infra-scale']);del s['faults'];del s['description']
        result=validate_scenario(s)
        self.assertEqual(result['faults'],[])
        self.assertEqual(result['description'],s['task'])

    def test_duplicate_assertion_names_rejected(self):
        s=copy.deepcopy(self.scenarios['infra-scale']);s['assertions'].append(s['assertions'][0])
        with self.assertRaises(ValidationError):validate_scenario(s)

if __name__=='__main__':unittest.main()
