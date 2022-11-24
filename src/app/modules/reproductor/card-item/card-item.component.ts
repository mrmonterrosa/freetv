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

  get getChannel() : Item {
    return this.playerService.getChannelSeleted;
  }

  constructor(private router :  Router,
              private playerService : PlayerService) {
                
                this.data = this.playerService.getChannelSeleted;

              }

  redirectTo(data : Item) {
    this.playerService.setCanal(data);
    this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
      this.router.navigate([data.id]);
    });
  }

}
