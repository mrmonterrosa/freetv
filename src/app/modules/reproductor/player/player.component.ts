import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Item } from '../../../interfaces/m3u.response';
import { PlayerService } from '../../../services/player.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent {

  private id : string = '';
  public canalData! : Item;

  get canal() : Item {
    return this.playerService.getChannelSeleted;
  }

  constructor(private playerService : PlayerService,
              private router : ActivatedRoute) { 
    this.id = this.router.snapshot.params['id'];
    this.playerService.getChannelById(this.id);
  }

}
