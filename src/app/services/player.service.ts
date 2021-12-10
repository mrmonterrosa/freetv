import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { M3UResponse, Item } from '../interfaces/m3u.response';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  private url = '';

  private canales : M3UResponse = {
    list : {
      item : [],
      service : '',
      title: ''
    },

  };
  
  public selectedM3u : Item = {
    thumb_square : '/assets/Freetv.jpg',
    title: 'Freetv',
    media_url: '/assets/movie.mp4',
  };

  private originalCanales : Item[] = [];

  get getCanales() : M3UResponse {
    return this.canales;
  }
  
  constructor(private http : HttpClient,
              private router :  Router) {
    this.url = environment.url;
    this.getChannelList();

  }
  /**
   * Obtiene la lista de canales desde el servicio. 
   */
  public getChannelList() : Subscription {
    return this.http.get<M3UResponse>(this.url)
      .subscribe(data => {
        this.canales = data;
        this.originalCanales = [...this.canales.list.item];
      });
  }
  /**
   * Obtine una lista con las coincidencias del termino de busqueda.
   * @param termino query de busqueda
   */
  public getChannelListByName(termino : string) : void {
    termino = termino.toLowerCase();
    let listItem : Item[] = this.canales.list.item
      .filter(canal => canal.title?.toLocaleLowerCase().includes(termino));
    
    if(listItem.length !== 0) {
      this.canales.list.item = listItem;
    } else {
      this.canales.list.item = this.originalCanales;
    }
  }
  /**
   * Obtiene el Canal (Item) según el id.
   * @param id query de busqueda
   */
  public getChannelById(id : string) : void {
    let item : Item | undefined  = this.canales.list.item
      .find(canal => canal.id === id);
    
    if(item === undefined) {
      this.selectedM3u = {
        thumb_square : '/assets/Freetv.jpg',
        title: 'Freetv',
        media_url: '/assets/movie.mp4',
      };
      this.router.navigate(['']);
    } else {
      this.selectedM3u = item;      
    }
  }


}
