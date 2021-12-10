import { Component, OnInit, Input } from '@angular/core';
import { M3UResponse } from '../../../interfaces/m3u.response';

@Component({
  selector: 'app-menu-flotante',
  templateUrl: './menu-flotante.component.html',
  styleUrls: ['./menu-flotante.component.css']
})
export class MenuFlotanteComponent implements OnInit {

  @Input() data! : M3UResponse;

  constructor() { }

  ngOnInit(): void {
  }

}
