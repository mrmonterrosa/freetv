import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Item } from '../../../interfaces/m3u.response';
import { PlayerService } from '../../../services/player.service';

@Component({
  selector: 'app-card-item',
  templateUrl: './card-item.component.html',
  styleUrls: ['./card-item.component.css']
})
export class CardItemComponent {

  @Input() data! : Item;
  private selectItem : Item = {};

  get itemSelected() {
    return this.playerService.selectedM3u;
  }

  constructor(private router :  Router,
              private playerService : PlayerService) { }

  redirectTo(id : any) {
    this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
      this.router.navigate([id]);
    });
  }

}
