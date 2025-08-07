import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Demo } from './pages/demo/demo';
import { RuleGeneration } from './pages/rule-generation/rule-generation';
import { RuleManagement } from './pages/rule-management/rule-management';
import { RuleTesting } from './pages/rule-testing/rule-testing';

const routes: Routes = [
  { path: '', redirectTo: '/demo', pathMatch: 'full' },
  { path: 'demo', component: Demo },
  { path: 'rule-generation', component: RuleGeneration },
  { path: 'rule-management', component: RuleManagement },
  { path: 'rule-testing', component: RuleTesting },
  { path: '**', redirectTo: '/demo' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
