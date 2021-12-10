import { Component } from '@angular/core';
import { PlayerService } from '../../services/player.service';
import { Item } from '../../interfaces/m3u.response';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  isShowMenuFlotante : boolean = false;

  constructor(private playerService : PlayerService) { }

  get canales() {
    return this.playerService.getCanales;
  }

  get canalSeleted() {
    return this.playerService.selectedM3u;
  }

  seletedChannel(item : Item) {
    this.playerService.selectedM3u = item;
  }

  mostrarMenu() {
    this.isShowMenuFlotante = !this.isShowMenuFlotante;    
  }

}
