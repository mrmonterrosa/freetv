import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Item } from '../../../interfaces/m3u.response';
import { PlayerService } from '../../../services/player.service';

@Component({
  selector: 'app-card-item',
  templateUrl: './card-item.component.html',
  styleUrls: ['./card-item.component.css'],
  imports: [CommonModule]
})
export class CardItemComponent {

  @Input() data!: Item;
  @Input() isSelected: boolean = false;
  public imageError: boolean = false;

  get isFavorite(): boolean {
    return this.playerService.isFavorite(this.data?.id);
  }

  constructor(private router: Router,
              private playerService: PlayerService) { }

  redirectTo(id: any): void {
    if (!id) return;
    this.playerService.getChannelById(id);
    this.router.navigate([id]);
  }

  toggleFav(event: MouseEvent): void {
    event.stopPropagation();
    this.playerService.toggleFavorite(this.data?.id);
  }

  onImageError(): void {
    this.imageError = true;
  }

}
