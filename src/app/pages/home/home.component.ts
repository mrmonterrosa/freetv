import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PlayerService } from '../../services/player.service';
import { Item } from '../../interfaces/m3u.response';
import { SearchComponent } from '../../modules/reproductor/search/search.component';
import { CardItemComponent } from '../../modules/reproductor/card-item/card-item.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [CommonModule, RouterModule, SearchComponent, CardItemComponent]
})
export class HomeComponent {

  public toastMessage: string = '';
  public showToast: boolean = false;
  public currentYear: number = new Date().getFullYear();
  public thumbError: boolean = false;
  private lastThumbChannelId?: string;
  private toastTimeout: any;

  constructor(private playerService: PlayerService,
              private router: Router) { }

  get canales() {
    return this.playerService.getCanales;
  }

  get canalSeleted(): Item {
    const current = this.playerService.selectedM3u;
    if (current?.id !== this.lastThumbChannelId) {
      this.lastThumbChannelId = current?.id;
      this.thumbError = false;
    }
    return current;
  }

  onThumbError(): void {
    this.thumbError = true;
  }

  get totalCanales(): number {
    return this.playerService.totalCanalesCount;
  }

  get isCurrentFav(): boolean {
    return this.playerService.isFavorite(this.canalSeleted?.id);
  }

  get currentChannelId(): string | undefined {
    return this.playerService.selectedM3u?.id;
  }

  trackByChannelId(index: number, item: Item): string {
    return item.id || `${index}`;
  }

  get activeCategory(): string {
    return this.playerService.selectedCategory;
  }

  toggleCurrentFav(): void {
    if (this.canalSeleted?.id) {
      const added = this.playerService.toggleFavorite(this.canalSeleted.id);
      this.displayToast(added ? '⭐ Canal agregado a tus favoritos' : 'Canal quitado de tus favoritos');
    }
  }

  copyStreamLink(): void {
    const urlToCopy = this.canalSeleted.media_url || window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(urlToCopy).then(() => {
        this.displayToast('📋 Enlace de transmisión copiado');
      }).catch(() => {
        this.displayToast('No se pudo copiar el enlace');
      });
    } else {
      this.displayToast('📋 Enlace: ' + urlToCopy);
    }
  }

  reloadStream(): void {
    if (this.canalSeleted?.id) {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([this.canalSeleted.id]);
        this.displayToast('🔄 Recargando transmisión...');
      });
    }
  }

  resetFilters(): void {
    this.playerService.setCategory('Todos');
    this.playerService.setSearchTerm('');
  }

  private displayToast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
    }, 2800);
  }

}
