import { Component, ElementRef, ViewChild } from '@angular/core';
import { PlayerService } from '../../../services/player.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent {

  /**
   * Se utiliza para obtener un elemento del html y manipularlo en TypeScript.
   */
  @ViewChild('texto') texto!:ElementRef<HTMLInputElement>;

  constructor(private playerService : PlayerService) { }
  /**
   * Método para la busqueda de infomación del array de canales.
   */
  search() {
    const texto = this.texto.nativeElement.value;
    if (texto.trim().length === 0) {
      return;
    }
    this.playerService.getChannelListByName(texto);
    this.texto.nativeElement.value = '';
  }

}
