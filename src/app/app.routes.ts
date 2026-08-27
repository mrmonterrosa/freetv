import { Routes } from '@angular/router';
import { PlayerComponent } from './modules/reproductor/player/player.component';

export const routes: Routes = [
  { path: '', component: PlayerComponent },
  { path: ':id', component: PlayerComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
