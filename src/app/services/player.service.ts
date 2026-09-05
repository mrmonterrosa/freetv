import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { M3UResponse, Item } from '../interfaces/m3u.response';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Subscription, catchError, of } from 'rxjs';
import { DEFAULT_CHANNELS_DATA } from '../data/default-channels.data';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  private url = '';

  private canales: M3UResponse = {
    list: {
      item: [...DEFAULT_CHANNELS_DATA.list.item],
      service: DEFAULT_CHANNELS_DATA.list.service || 'iptv',
      title: DEFAULT_CHANNELS_DATA.list.title || 'iptv'
    },
  };
  
  public selectedM3u: Item = {
    thumb_square: 'assets/Freetv.jpg',
    title: 'Freetv',
    media_url: 'assets/movie.mp4',
    group: 'General',
    country: 'Global'
  };

  private originalCanales: Item[] = [...DEFAULT_CHANNELS_DATA.list.item];
  public selectedCategory: string = 'Todos';
  public searchTerm: string = '';
  public favorites: Set<string> = new Set<string>();
  public dynamicCategories: string[] = [
    'Todos',
    'Favoritos',
    'Deportes',
    'Entretenimiento',
    'Noticias',
    'Música',
    'Series',
    'Películas',
    'Religión',
    'Cultura',
    'Anime'
  ];

  get getCanales(): M3UResponse {
    return this.canales;
  }

  get totalCanalesCount(): number {
    return this.originalCanales.length;
  }

  constructor(private http: HttpClient,
              private router: Router) {
    this.url = environment.url;
    this.extractCategories();
    this.loadFavorites();
    this.applyFilters();
    this.getChannelList();
  }

  /**
   * Carga los favoritos guardados desde LocalStorage.
   */
  private loadFavorites(): void {
    try {
      const saved = localStorage.getItem('freetv_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.favorites = new Set<string>(parsed);
        }
      }
    } catch (e) {
      console.warn('No se pudieron cargar los favoritos desde localStorage', e);
    }
  }

  /**
   * Guarda los favoritos en LocalStorage.
   */
  private saveFavorites(): void {
    try {
      localStorage.setItem('freetv_favorites', JSON.stringify(Array.from(this.favorites)));
    } catch (e) {
      console.warn('No se pudieron guardar los favoritos en localStorage', e);
    }
  }

  /**
   * Alterna el estado de favorito de un canal.
   */
  public toggleFavorite(id?: string): boolean {
    if (!id) return false;
    let isFav = false;
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      isFav = false;
    } else {
      this.favorites.add(id);
      isFav = true;
    }
    this.saveFavorites();
    if (this.selectedCategory === 'Favoritos') {
      this.applyFilters();
    }
    return isFav;
  }

  /**
   * Verifica si un canal es favorito.
   */
  public isFavorite(id?: string): boolean {
    if (!id) return false;
    return this.favorites.has(id);
  }

  /**
   * Obtiene la lista de canales desde el servicio con fallback automático a canales locales. 
   */
  public getChannelList(): Subscription {
    return this.http.get<M3UResponse>(this.url)
      .pipe(
        catchError(err => {
          console.warn('API remota no disponible o bloqueada, conservando catálogo integrado:', err);
          return of(null);
        })
      )
      .subscribe({
        next: (data: M3UResponse | null) => {
          if (data && data.list && Array.isArray(data.list.item) && data.list.item.length > 0) {
            this.canales = data;
            this.originalCanales = [...data.list.item];
            this.extractCategories();
            this.applyFilters();
          }
        },
        error: (err: any) => {
          console.warn('Error al actualizar canales remotos:', err);
        }
      });
  }

  /**
   * Extrae y normaliza las categorías presentes en la lista de canales.
   */
  private extractCategories(): void {
    const categorySet = new Set<string>();
    for (const item of this.originalCanales) {
      if (item.group && item.group.trim().length > 0) {
        let groupName = item.group.trim();
        const lower = groupName.toLowerCase();
        if (lower === 'deporte' || lower === 'deportes') groupName = 'Deportes';
        else if (lower === 'serie' || lower === 'series') groupName = 'Series';
        else if (lower === 'pelicula' || lower === 'peliculas' || lower === 'películas') groupName = 'Películas';
        else if (lower === 'musica' || lower === 'música') groupName = 'Música';
        else if (lower === 'religion' || lower === 'religión') groupName = 'Religión';
        else if (lower === 'noticia' || lower === 'noticias') groupName = 'Noticias';
        else if (lower === 'cultura') groupName = 'Cultura';
        else if (lower === 'entretenimiento') groupName = 'Entretenimiento';
        else if (lower === 'anime') groupName = 'Anime';
        categorySet.add(groupName);
      }
    }
    const sorted = Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'es'));
    this.dynamicCategories = ['Todos', 'Favoritos', ...sorted];
  }

  /**
   * Establece la categoría activa y filtra la lista.
   */
  public setCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  /**
   * Actualiza el término de búsqueda y aplica filtros.
   */
  public setSearchTerm(term: string): void {
    this.searchTerm = term.trim().toLowerCase();
    this.applyFilters();
  }

  /**
   * Aplica los filtros combinados de búsqueda y categoría.
   */
  public applyFilters(): void {
    let result = [...this.originalCanales];

    // 1. Filtrar por categoría
    if (this.selectedCategory === 'Favoritos') {
      result = result.filter(item => item.id && this.favorites.has(item.id));
    } else if (this.selectedCategory !== 'Todos') {
      result = result.filter(item => {
        if (!item.group) return false;
        const grp = item.group.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const target = this.selectedCategory.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (target === 'deportes' && (grp === 'deporte' || grp === 'deportes')) return true;
        if (target === 'series' && (grp === 'serie' || grp === 'series')) return true;
        if (target === 'peliculas' && (grp === 'pelicula' || grp === 'peliculas')) return true;
        return grp === target;
      });
    }

    // 2. Filtrar por término de búsqueda
    if (this.searchTerm.length > 0) {
      result = result.filter(item => {
        const title = (item.title || '').toLowerCase();
        const country = (item.country || '').toLowerCase();
        const group = (item.group || '').toLowerCase();
        return title.includes(this.searchTerm) || 
               country.includes(this.searchTerm) || 
               group.includes(this.searchTerm);
      });
    }

    this.canales.list.item = result;
  }

  /**
   * Método de compatibilidad para búsqueda de canales.
   */
  public getChannelListByName(termino: string): void {
    this.setSearchTerm(termino);
  }

  /**
   * Obtiene el Canal (Item) según el id.
   */
  public getChannelById(id: string): void {
    let item: Item | undefined = this.originalCanales.length > 0
      ? this.originalCanales.find(canal => canal.id === id)
      : this.canales.list.item.find(canal => canal.id === id);
    
    if (item === undefined) {
      if (this.originalCanales.length > 0 && id) {
        // Si el id no coincide con ninguno, redirigir a Home
        this.selectedM3u = {
          thumb_square: 'assets/Freetv.jpg',
          title: 'Freetv',
          media_url: 'assets/movie.mp4',
          group: 'General',
          country: 'Global'
        };
        this.router.navigate(['']);
      }
    } else {
      this.selectedM3u = item;      
    }
  }

  public isDrawerOpen: boolean = false;

  public toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  public openDrawer(): void {
    this.isDrawerOpen = true;
  }

  public closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  /**
   * Obtiene el siguiente canal disponible en la lista activa.
   */
  public getNextChannel(currentId?: string): Item | null {
    const list = this.canales?.list?.item || [];
    if (list.length === 0) return null;
    const currentIndex = list.findIndex(c => c.id === currentId);
    if (currentIndex === -1) return list[0];
    const nextIndex = (currentIndex + 1) % list.length;
    return list[nextIndex];
  }

  /**
   * Obtiene el canal anterior en la lista activa.
   */
  public getPreviousChannel(currentId?: string): Item | null {
    const list = this.canales?.list?.item || [];
    if (list.length === 0) return null;
    const currentIndex = list.findIndex(c => c.id === currentId);
    if (currentIndex === -1) return list[list.length - 1];
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    return list[prevIndex];
  }

  /**
   * Genera el badge corto (código de 2-3 letras) para el canal (ej: CA, ES, CO, SP).
   */
  public getChannelBadge(canal?: Item): string {
    if (!canal) return 'CA';
    if (canal.country && canal.country.trim().length > 0 && canal.country !== 'Global') {
      const c = canal.country.trim().toUpperCase();
      if (c.length <= 3) return c;
      const map: Record<string, string> = {
        'COLOMBIA': 'CO',
        'ESPANA': 'ES',
        'ESPAÑA': 'ES',
        'MEXICO': 'MX',
        'MÉXICO': 'MX',
        'ARGENTINA': 'AR',
        'CHILE': 'CL',
        'PERU': 'PE',
        'PERÚ': 'PE',
        'VENEZUELA': 'VE',
        'ECUADOR': 'EC',
        'ESTADOS UNIDOS': 'US',
        'USA': 'US'
      };
      if (map[c]) return map[c];
      return c.substring(0, 2);
    }
    if (canal.group && canal.group.trim().length > 0) {
      const g = canal.group.trim().toUpperCase();
      if (g.startsWith('DEP')) return 'SP';
      if (g.startsWith('NOT')) return 'NW';
      if (g.startsWith('PEL') || g.startsWith('CIN')) return 'MV';
      if (g.startsWith('SER')) return 'SR';
      if (g.startsWith('MUS')) return 'MU';
      return g.substring(0, 2);
    }
    return 'CA';
  }

}


