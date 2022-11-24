import { ChangeDetectionStrategy, Component, ElementRef, ViewChild} from '@angular/core';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent  {
  

  constructor(private playerService : PlayerService) {

    this.playerService.scrollSelected();

  }
  
  get canales() {
    return this.playerService.getCanales;
  }
  


}
