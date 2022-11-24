import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerComponent } from './player/player.component';
import { CardItemComponent } from './card-item/card-item.component';
import { SearchComponent } from './search/search.component';
import { MenuFlotanteComponent } from './menu-flotante/menu-flotante.component';
import { VimeModule } from '@vime/angular';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    PlayerComponent,
    CardItemComponent,
    SearchComponent,
  ],
  exports: [
    PlayerComponent,
    CardItemComponent,
    SearchComponent,
  ],
  imports: [
    CommonModule,
    VimeModule,
    RouterModule
  ]
})
export class ReproductorModule { }
