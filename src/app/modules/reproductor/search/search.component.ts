import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../../services/player.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  imports: [CommonModule]
})
export class SearchComponent {

  @ViewChild('texto') texto!: ElementRef<HTMLInputElement>;

  constructor(private playerService: PlayerService) { }

  get categories(): string[] {
    return this.playerService.dynamicCategories;
  }

  get activeCategory(): string {
    return this.playerService.selectedCategory;
  }

  get searchTerm(): string {
    return this.playerService.searchTerm;
  }

  get totalFavorites(): number {
    return this.playerService.favorites.size;
  }

  /**
   * Filtrado en tiempo real al escribir en el input.
   */
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.playerService.setSearchTerm(value);
  }

  /**
   * Selección de chip de categoría.
   */
  selectCategory(category: string): void {
    this.playerService.setCategory(category);
  }

  /**
   * Limpia el campo de búsqueda.
   */
  clearSearch(): void {
    if (this.texto) {
      this.texto.nativeElement.value = '';
    }
    this.playerService.setSearchTerm('');
  }

  /**
   * Retorna el icono representativo para cada categoría.
   */
  getCategoryIcon(category: string): string {
    const cat = category.toLowerCase();
    if (cat === 'todos') return 'bi-grid-fill';
    if (cat === 'favoritos') return 'bi-star-fill';
    if (cat.includes('deport')) return 'bi-trophy-fill';
    if (cat.includes('noticia')) return 'bi-newspaper';
    if (cat.includes('entreten')) return 'bi-film';
    if (cat.includes('músic') || cat.includes('music')) return 'bi-music-note-beamed';
    if (cat.includes('pelicul')) return 'bi-camera-reels-fill';
    if (cat.includes('serie')) return 'bi-tv-fill';
    if (cat.includes('religi')) return 'bi-sun-fill';
    if (cat.includes('cultur')) return 'bi-book-fill';
    if (cat.includes('anime')) return 'bi-lightning-charge-fill';
    return 'bi-tag-fill';
  }

  /**
   * Permite scroll horizontal fluido con la rueda del ratón en la barra de categorías.
   */
  onWheel(event: WheelEvent): void {
    if (event.deltaY !== 0) {
      const container = event.currentTarget as HTMLElement;
      container.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }

  /**
   * Método de compatibilidad para Enter.
   */
  search(): void {
    const texto = this.texto.nativeElement.value;
    this.playerService.setSearchTerm(texto);
  }

}
