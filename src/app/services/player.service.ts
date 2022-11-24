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
  
  private itemSeleted : Item = {
    id: 'freetv',
    thumb_square : '/assets/Freetv.jpg', // "/assets/Freetv.jpg" dejar de esta forma si se trabja en local
    title: 'Freetv',
    media_url: '/assets/movie.mp4',   // de lo contrario utilizar el nombre del repositorio para encontrar el recurso.
  };

  private canales : M3UResponse = {
    list : {
      item : [],
      service : '',
      title: ''
    },

  };
  
  private selectedM3u : Item = {
    thumb_square : '/assets/Freetv.jpg', // "/assets/Freetv.jpg" dejar de esta forma si se trabja en local
    title: 'Freetv',
    media_url: '/assets/movie.mp4',   // de lo contrario utilizar el nombre del repositorio para encontrar el recurso.
  };

  private originalCanales : Item[] = [];

  get getCanales() : M3UResponse {
    return this.canales;
  }
  
  public setCanal(channel :Item) {
    this.itemSeleted = channel;
    this.saveItemLocal(this.itemSeleted);
  }

  get getChannelSeleted() : Item {
    this.getItemLocal();
    return this.itemSeleted;
  }

  private saveItemLocal(channel :Item){
    localStorage.setItem("channel", JSON.stringify(channel));
  }

  private getItemLocal() {
    if(localStorage.getItem("channel") !== null) {
      let data = JSON.parse(localStorage.getItem("channel")!);
      this.itemSeleted.author = data.author;
      this.itemSeleted.country = data.country;
      this.itemSeleted.group = data.group;
      this.itemSeleted.id = data.id;
      this.itemSeleted.language = data.language;
      this.itemSeleted.media_url = data.media_url;
      this.itemSeleted.playlistURL = data.playlistURL;
      this.itemSeleted.service = data.service;
      this.itemSeleted.thumb_square = data.thumb_square;
      this.itemSeleted.title = data.title;
      this.itemSeleted.url = data.url;
    }
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

    termino = termino.trim().toLowerCase();

    if(termino.length === 0) {
      this.canales.list.item = this.originalCanales;
      this.scrollSelected();
      return;
    };
   
    this.canales.list.item = [...this.originalCanales];
    this.canales.list.item = this.canales.list.item
    .filter(canal => canal.title?.toLocaleLowerCase().includes(termino));

    if(this.canales.list.item.length === 0) {
      this.canales.list.item = [...this.originalCanales];
      this.scrollSelected();
    }

  }
  /**
   * Obtiene el Canal (Item) según el id.
   * @param id query de busqueda
   */
  public getChannelById(id : string) : void {
    let item : Item | undefined  = this.canales.list.item
      .find(canal => canal.id === id);
    
    if(item === undefined || item === null) {
      this.selectedM3u = {
        thumb_square : '/freetv/assets/Freetv.jpg',
        title: 'Freetv',
        media_url: '/freetv/assets/movie.mp4',
      };
      this.router.navigate(['']);
    } else {
      this.selectedM3u = item;      
    }
  }


  public scrollSelected() : void {
    
      setTimeout(() => {
        document.getElementById(this.itemSeleted.id!)?.scrollIntoView({ behavior: "smooth"});
      }, 1500);
  }
  

}
