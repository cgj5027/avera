import React from 'react';
import {beforeEach, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {matches} from './queryFixture';
const fixture=vi.hoisted(()=>({client:null}));
const sdk=vi.hoisted(()=>({functions:{invoke:vi.fn()}}));
vi.mock('npm:@base44/sdk@0.8.52',()=>({createClientFromRequest:()=>fixture.client}));
vi.mock('@/api/base44Client',()=>({base44:sdk}));
import contribute from '../base44/functions/logGoalContribution/entry.ts';
import feedback from '../base44/functions/submitFeedback/entry.ts';
import ask from '../base44/functions/askAvera/entry.ts';
import IncomeDialog from '../src/components/income/IncomeDialog';
import FeedbackForm from '../src/components/settings/FeedbackForm';
import {projectYearlyPlan,totalMonthlyExpenses} from '../src/services/financialCalculations';
import {monthlyAllocation} from '../src/services/overviewAllocation';
import {withGoalContributions} from '../base44/shared/goalSavings.ts';
const req=body=>new Request('https://fixture.test',{method:'POST',body:JSON.stringify(body)});
let user,rows;
beforeEach(()=>{
 vi.resetAllMocks();user={id:'a'};rows={};
 const entities={};
 for(const name of ['Goal','GoalContribution','Feedback','IncomeSource','Bill','BudgetCategory','Account','Transaction','Property','MortgageRecord','HouseholdProfile','JobProfile']) {
  rows[name]=[];
  entities[name]={filter:vi.fn(async q=>({items:rows[name].filter(r=>matches(r,q)),has_more:false})),upsert:vi.fn(async(values,{key})=>{for(const value of values){const old=rows[name].find(r=>r[key]===value[key]);if(old)Object.assign(old,value);else rows[name].push({...value,id:`${name}-${rows[name].length}`,created_by_id:user.id});}})};
 }
 fixture.client={auth:{me:async()=>user},entities,asServiceRole:{integrations:{Core:{InvokeLLM:vi.fn(async()=>({answer:'Fixture'}))}}}};
 rows.Goal=[{id:'g',created_by_id:'a',saved_amount:100,target_amount:1000,target_date:'2027-01-01'}];
});
it.each([contribute,feedback])('rejects anonymous calls before persistence',async handler=>{user=null;expect((await handler(req({}))).status).toBe(401);expect(fixture.client.entities.Feedback.upsert).not.toHaveBeenCalled();expect(fixture.client.entities.GoalContribution.upsert).not.toHaveBeenCalled();});
it('rejects another user, another dataset and invalid contribution values',async()=>{
 rows.Goal.push({id:'foreign',created_by_id:'b'});
 const body={goal_id:'g',amount:10,request_id:'request-valid-0001'};
 expect((await contribute(req({...body,goal_id:'foreign'}))).status).toBe(404);
 expect((await contribute(req({...body,dataset:{mode:'demo',profile:'early_career'}}))).status).toBe(404);
 for(const amount of [0,-1,null,'10',0.001,1e10])expect((await contribute(req({...body,amount}))).status).toBe(400);
 expect(rows.GoalContribution).toHaveLength(0);
});
it('retains independent contributions, deduplicates retries and rejects changed retry amounts',async()=>{
 const a={goal_id:'g',amount:10.25,request_id:'request-first-0001'};
 const b={goal_id:'g',amount:20.25,request_id:'request-second-0002'};
 expect((await Promise.all([contribute(req(a)),contribute(req(b))])).map(r=>r.status)).toEqual([200,200]);
 await contribute(req(a));
 expect(withGoalContributions(rows.Goal,rows.GoalContribution)[0].saved_amount).toBe(130.5);
 expect(rows.GoalContribution).toHaveLength(2);
 expect((await contribute(req({...a,amount:11}))).status).toBe(409);
 expect(rows.Goal[0].saved_amount).toBe(100);
});
it('uses the same category-inclusive expenses in the annual plan, allocation, goals and Ask Avera',async()=>{
 const incomes=[{amount:3000,frequency:'monthly'}];const bills=[{name:'Rent',amount:600,category:' housing ',frequency:'monthly'}];const budgetCategories=[{name:'Housing',monthly_limit:1500}];
 rows.IncomeSource=incomes.map(r=>({...r,created_by_id:'a'}));rows.Bill=bills.map(r=>({...r,created_by_id:'a'}));rows.BudgetCategory=budgetCategories.map(r=>({...r,created_by_id:'a'}));
 rows.GoalContribution=[{goal_id:'g',amount:25,contribution_key:'a:g:test',created_by_id:'a'}];
 const projection=projectYearlyPlan({incomes,bills,budgetCategories});
 expect(projection.monthlyExpenses).toBe(1500);expect(projection.annualExpenses).toBe(18000);
 expect(totalMonthlyExpenses({bills,budgetCategories})).toBe(1500);
 expect(monthlyAllocation(projection,{bills,budgetCategories}).expenses).toBe(1500);
 expect((await ask(req({question:'What can I save?'}))).status).toBe(200);
 const prompt=fixture.client.asServiceRole.integrations.Core.InvokeLLM.mock.calls[0][0].prompt;
 const context=JSON.parse(prompt.split('FINANCIAL CONTEXT (JSON):\n')[1].split('\nUSER QUESTION')[0]);
 expect(context.planned_monthly_expenses).toBe(1500);expect(context.insights.planning_surplus).toBe(1500);expect(context.goals[0].saved_amount).toBe(125);
});
it('feedback allowlists only consented fields, scopes its key and makes retries idempotent',async()=>{
 const body={rating:4,message:'Useful layout',consent:true,request_id:'feedback-request-0001',created_by_id:'b',accounts:[{balance:123}],chat:'private'};
 expect((await feedback(req(body))).status).toBe(200);await feedback(req(body));
 expect(rows.Feedback).toHaveLength(1);
 expect(rows.Feedback[0]).toEqual({id:'Feedback-0',created_by_id:'a',rating:4,message:'Useful layout',consent:true,submission_key:'a:feedback-request-0001'});
 expect((await feedback(req({...body,consent:false}))).status).toBe(400);
 expect((await feedback(req({...body,rating:6}))).status).toBe(400);
});
it('sanitizes feedback and contribution provider failures',async()=>{
 fixture.client.entities.Feedback.upsert.mockRejectedValue(new Error('private-provider-secret'));
 fixture.client.entities.GoalContribution.upsert.mockRejectedValue(new Error('private-provider-secret'));
 for(const [handler,body] of [[feedback,{rating:3,message:'Testing',consent:true,request_id:'request-test-0001'}],[contribute,{goal_id:'g',amount:10,request_id:'request-test-0001'}]]) {
  const result=await handler(req(body));expect(result.status).toBe(503);expect(await result.text()).not.toContain('private-provider');
 }
});
it('feedback UI validates consent, keeps a failed draft and retries without attaching finances',async()=>{
 sdk.functions.invoke.mockRejectedValueOnce(new Error('Network')).mockResolvedValueOnce({data:{saved:true}});
 render(<FeedbackForm />);
 fireEvent.click(screen.getByRole('button',{name:'Submit feedback'}));expect(screen.getByRole('alert')).toBeTruthy();expect(sdk.functions.invoke).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('radio',{name:'4 of 5'}));fireEvent.change(screen.getByLabelText('Your feedback'),{target:{value:'Useful layout'}});fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Submit feedback'}));await screen.findByText('Feedback was not confirmed. Please retry.');
 expect(screen.getByLabelText('Your feedback').value).toBe('Useful layout');
 fireEvent.click(screen.getByRole('button',{name:'Submit feedback'}));await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Feedback saved'));
 expect(sdk.functions.invoke.mock.calls[0][1]).toEqual(sdk.functions.invoke.mock.calls[1][1]);
 expect(Object.keys(sdk.functions.invoke.mock.calls[0][1]).sort()).toEqual(['consent','message','rating','request_id']);
});

it('income entry preserves explicit net basis and treats legacy entries as unspecified',async()=>{
 const save=vi.fn();const view=render(<IncomeDialog open onOpenChange={()=>{}} income={{name:'Salary',amount:1000,income_basis:'net'}} onSave={save} />);
 expect(screen.getByLabelText('Income basis').textContent).toContain('Net');
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));await waitFor(()=>expect(save).toHaveBeenCalled());expect(save.mock.calls[0][0].income_basis).toBe('net');
 view.rerender(<IncomeDialog open onOpenChange={()=>{}} income={{name:'Legacy',amount:1000}} onSave={save} />);
 expect(screen.getByLabelText('Income basis').textContent).toContain('Not specified');
});

it('Ask Avera and the frontend normalize half-cent boundary values identically',async()=>{
 rows.IncomeSource=[{created_by_id:'a',amount:1.005,frequency:'monthly'}];
 await ask(req({question:'What income is recorded?'}));
 const prompt=fixture.client.asServiceRole.integrations.Core.InvokeLLM.mock.calls[0][0].prompt;
 const context=JSON.parse(prompt.split('FINANCIAL CONTEXT (JSON):\n')[1].split('\nUSER QUESTION')[0]);
 expect(context.income.monthly_total).toBe(projectYearlyPlan({incomes:rows.IncomeSource}).monthlyIncome);
 expect(context.income.monthly_total).toBe(1.01);
});

it('preserves cent precision when combining legacy starting savings and ledger rows',()=>{
 expect(withGoalContributions([{id:'g',saved_amount:1.005}],[{goal_id:'g',amount:0.01,contribution_key:'key'}])[0].saved_amount).toBe(1.02);
});
