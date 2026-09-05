import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  NgZone,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Item } from '../../../interfaces/m3u.response';
import { PlayerService } from '../../../services/player.service';
import { SearchComponent } from '../search/search.component';
import { CardItemComponent } from '../card-item/card-item.component';
import Hls from 'hls.js';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css'],
  imports: [CommonModule, SearchComponent, CardItemComponent]
})
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('playerContainer') playerContainerRef!: ElementRef<HTMLDivElement>;
  
  private hls: Hls | null = null;
  public isLoading: boolean = true;
  public hasError: boolean = false;
  public errorMessage: string = '';
  public loadingMessage: string = 'Conectando con la señal en vivo...';

  public attempt: number = 1;
  public readonly MAX_ATTEMPTS: number = 3;
  public introKey: number = 1;

  // Estados de la barra de controles inferior
  public isMuted: boolean = false;
  public isFullscreen: boolean = false;
  public showControls: boolean = true;
  private controlsTimeout: any = null;

  // Toast feedback
  public toastMessage: string = '';
  public showToast: boolean = false;
  private toastTimeout: any = null;

  private connectionTimeout: any = null;
  private retryTimeout: any = null;
  private readonly TIMEOUT_MS = 4500;
  private readonly RETRY_DELAY_MS = 1800;

  get canal(): Item {
    return this.playerService.selectedM3u;
  }

  get isIntro(): boolean {
    return !this.canal?.id || this.canal?.media_url === 'assets/movie.mp4';
  }

  get isFavorite(): boolean {
    return this.playerService.isFavorite(this.canal?.id);
  }

  get channelBadge(): string {
    return this.playerService.getChannelBadge(this.canal);
  }

  get canales() {
    return this.playerService.getCanales;
  }

  get currentChannelId(): string | undefined {
    return this.playerService.selectedM3u?.id;
  }

  constructor(
    public playerService: PlayerService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.playerService.getChannelById(id);
      }
      this.updateSeoMetadata(this.canal);
      if (this.videoPlayerRef || this.isIntro) {
        this.loadMedia();
      }
    });

    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.resetControlsTimeout();
  }

  ngAfterViewInit(): void {
    this.updateSeoMetadata(this.canal);
    this.loadMedia();
  }

  trackByChannelId(index: number, item: Item): string {
    return item.id || `${index}`;
  }

  resetFilters(): void {
    this.playerService.setCategory('Todos');
    this.playerService.setSearchTerm('');
  }

  closeDrawer(): void {
    this.playerService.closeDrawer();
  }

  onChannelSelect(item: Item): void {
    if (window.innerWidth < 768) {
      this.playerService.closeDrawer();
    }
  }

  public displayToast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 2800);
    this.cdr.detectChanges();
  }

  /**
   * Manejador global de atajos de teclado para una experiencia tipo Smart IPTV.
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    this.onUserActivity();

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.playPreviousChannel();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.playNextChannel();
        break;
      case 'm':
      case 'M':
        this.toggleMute();
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 'l':
      case 'L':
      case ' ':
        event.preventDefault();
        this.playerService.toggleDrawer();
        break;
      case 'Escape':
        if (this.playerService.isDrawerOpen) {
          event.preventDefault();
          this.playerService.closeDrawer();
        }
        break;
    }
  }

  @HostListener('mousemove')
  @HostListener('touchstart')
  onUserActivity(): void {
    this.showControls = true;
    this.resetControlsTimeout();
    this.cdr.detectChanges();
  }

  /**
   * Alterna la visibilidad de los controles al tocar la pantalla en móviles o hacer clic en el video.
   */
  public toggleControls(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showControls = !this.showControls;
    if (this.showControls) {
      this.resetControlsTimeout();
    } else {
      if (this.controlsTimeout) {
        clearTimeout(this.controlsTimeout);
      }
    }
    this.cdr.detectChanges();
  }

  /**
   * Manejador de eventos táctiles para dispositivos móviles.
   */
  public onTouchCapture(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.toggleControls(event);
  }

  public goToIntro(): void {
    this.router.navigate(['']);
  }

  private resetControlsTimeout(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    // Ocultar tras 4.5s si no hay error ni estamos en intro ni el drawer está abierto
    this.controlsTimeout = setTimeout(() => {
      if (!this.hasError && !this.isIntro && !this.isLoading && !this.playerService.isDrawerOpen) {
        this.showControls = false;
        this.cdr.detectChanges();
      }
    }, 4500);
  }

  private onFullscreenChange = (): void => {
    this.isFullscreen = !!document.fullscreenElement;
    this.cdr.detectChanges();
  };

  /**
   * Actualiza dinámicamente el título y metadatos SEO.
   */
  private updateSeoMetadata(canal: Item): void {
    if (canal && canal.id && canal.title && canal.media_url !== 'assets/movie.mp4') {
      const title = canal.title;
      const group = canal.group ? ` (${canal.group})` : '';
      const country = canal.country ? ` • ${canal.country}` : '';
      this.titleService.setTitle(`Ver ${title} en Vivo Online Gratis${country} | FreeTV`);
      this.metaService.updateTag({
        name: 'description',
        content: `Disfruta la señal en directo de ${title}${group}${country} gratis por internet en FreeTV. Streaming en alta definición sin cortes.`
      });
      this.metaService.updateTag({
        property: 'og:title',
        content: `Ver ${title} en Vivo Online Gratis | FreeTV`
      });
      this.metaService.updateTag({
        property: 'og:description',
        content: `Transmisión oficial de ${title} en directo por internet en FreeTV.`
      });
      if (canal.thumb_square) {
        this.metaService.updateTag({
          property: 'og:image',
          content: canal.thumb_square
        });
      }
    } else {
      this.titleService.setTitle('FreeTV — Televisión en Vivo | Mr. Monterrosa');
      this.metaService.updateTag({
        name: 'description',
        content: 'FreeTV — Plataforma moderna de televisión en vivo con canales libres por internet. Deportes, noticias, entretenimiento y series en streaming de alta calidad.'
      });
    }
  }

  public loadMedia(): void {
    if (this.isIntro) {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.hasError = false;
        this.destroyHls();
        this.cdr.detectChanges();
      });
      return;
    }
    this.attempt = 1;
    this.loadingMessage = 'Conectando con la señal en vivo...';
    this.clearRetryTimeout();
    this.executeLoadMedia();
  }

  public playFirstChannel(): void {
    const list = this.playerService.getCanales?.list?.item;
    if (list && list.length > 0) {
      const first = list[0];
      if (first?.id) {
        this.playerService.getChannelById(first.id);
        this.router.navigate([first.id]);
      }
    }
  }

  public replayIntro(): void {
    this.introKey++;
    this.cdr.detectChanges();
  }

  private executeLoadMedia(): void {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;

    this.destroyHls();
    this.clearConnectionTimeout();

    this.ngZone.run(() => {
      this.isLoading = true;
      this.hasError = false;
      this.errorMessage = '';
      if (this.attempt > 1) {
        this.loadingMessage = `Reconectando señal en vivo (${this.attempt} de ${this.MAX_ATTEMPTS})...`;
      } else {
        this.loadingMessage = 'Conectando con la señal en vivo...';
      }
      this.cdr.detectChanges();
    });

    const mediaUrl = this.canal?.media_url || '';
    if (!mediaUrl) {
      this.handleFatalPlaybackError('No se encontró un enlace de transmisión para este canal.');
      return;
    }

    this.startConnectionTimeout();

    const isHls = mediaUrl.includes('.m3u8') || mediaUrl.includes('manifest') || !mediaUrl.endsWith('.mp4');

    if (isHls && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 4000,
        manifestLoadingMaxRetry: 0,
        levelLoadingTimeOut: 4000,
        levelLoadingMaxRetry: 0,
        fragLoadingTimeOut: 4000,
        fragLoadingMaxRetry: 0,
      });

      this.hls.loadSource(mediaUrl);
      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.ngZone.run(() => {
          this.clearConnectionTimeout();
          this.clearRetryTimeout();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
        video.play().catch(err => {
          console.warn('Autoplay bloqueado por el navegador:', err);
        });
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn(`Hls error intento (${this.attempt}/${this.MAX_ATTEMPTS}):`, data.type, data.details, data.fatal);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
            case Hls.ErrorTypes.MEDIA_ERROR:
            default:
              this.handleRetryOrError('Error en la transmisión de video');
              break;
          }
        } else if (data.details === 'manifestLoadError' || data.details === 'manifestLoadTimeOut') {
          this.handleRetryOrError('No se pudo conectar con el servidor de la transmisión');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      video.src = mediaUrl;
      video.load();
      video.play().then(() => {
        this.ngZone.run(() => {
          this.clearConnectionTimeout();
          this.clearRetryTimeout();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }).catch(err => {
        console.warn('Autoplay Safari/MP4:', err);
      });
    } else {
      this.handleFatalPlaybackError('Tu navegador no soporta reproducción HLS');
    }
  }

  private startConnectionTimeout(): void {
    this.clearConnectionTimeout();
    this.connectionTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        if (this.isLoading && !this.hasError) {
          console.warn(`Timeout de conexión alcanzado en intento (${this.attempt}/${this.MAX_ATTEMPTS}) para:`, this.canal?.title);
          this.handleRetryOrError('Tiempo de espera agotado');
        }
      });
    }, this.TIMEOUT_MS);
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private clearRetryTimeout(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private handleRetryOrError(reason: string): void {
    this.clearConnectionTimeout();
    this.clearRetryTimeout();
    this.destroyHls();

    if (this.attempt < this.MAX_ATTEMPTS) {
      this.attempt++;
      this.ngZone.run(() => {
        this.isLoading = true;
        this.hasError = false;
        this.loadingMessage = `Reconectando señal en vivo (${this.attempt} de ${this.MAX_ATTEMPTS})...`;
        this.cdr.detectChanges();
      });
      this.retryTimeout = setTimeout(() => {
        this.executeLoadMedia();
      }, this.RETRY_DELAY_MS);
    } else {
      this.handleFatalPlaybackError(`La señal de ${this.canal?.title || 'este canal'} no respondió tras ${this.MAX_ATTEMPTS} intentos.`);
    }
  }

  private handleFatalPlaybackError(msg: string): void {
    this.ngZone.run(() => {
      this.clearConnectionTimeout();
      this.clearRetryTimeout();
      this.destroyHls();
      this.hasError = true;
      this.isLoading = false;
      this.errorMessage = msg;
      this.showControls = true;
      this.cdr.detectChanges();
    });
  }

  onPlaying(): void {
    this.ngZone.run(() => {
      this.clearConnectionTimeout();
      this.clearRetryTimeout();
      this.isLoading = false;
      this.hasError = false;
      this.cdr.detectChanges();
    });
  }

  onCanPlay(): void {
    this.ngZone.run(() => {
      this.clearConnectionTimeout();
      this.clearRetryTimeout();
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  onWaiting(): void {
    if (!this.hasError) {
      this.ngZone.run(() => {
        this.isLoading = true;
        this.startConnectionTimeout();
        this.cdr.detectChanges();
      });
    }
  }

  onVideoError(event: Event): void {
    if (!this.hasError) {
      this.handleRetryOrError('Error en elemento de video');
    }
  }

  public retryPlayback(): void {
    this.loadMedia();
  }

  // =========================================================================
  // 🎮 Controles Interactivos de la Barra Inferior (Estilo Vavoo / Modern IPTV)
  // =========================================================================

  public toggleMute(): void {
    const video = this.videoPlayerRef?.nativeElement;
    if (video) {
      this.isMuted = !this.isMuted;
      video.muted = this.isMuted;
      this.displayToast(this.isMuted ? '🔇 Audio silenciado' : '🔊 Audio activado');
    }
  }

  public playPreviousChannel(): void {
    const prev = this.playerService.getPreviousChannel(this.canal?.id);
    if (prev?.id) {
      this.playerService.getChannelById(prev.id);
      this.router.navigate([prev.id]);
    }
  }

  public playNextChannel(): void {
    const next = this.playerService.getNextChannel(this.canal?.id);
    if (next?.id) {
      this.playerService.getChannelById(next.id);
      this.router.navigate([next.id]);
    }
  }

  public toggleFavorite(): void {
    if (this.canal?.id) {
      const added = this.playerService.toggleFavorite(this.canal.id);
      this.displayToast(added ? '⭐ Canal agregado a tus favoritos' : 'Canal quitado de tus favoritos');
    }
  }

  public toggleFullscreen(): void {
    const container = this.playerContainerRef?.nativeElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }

  public togglePiPOrShare(): void {
    const video = this.videoPlayerRef?.nativeElement;
    if (video && document.pictureInPictureEnabled && !video.disablePictureInPicture) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(console.warn);
      } else {
        video.requestPictureInPicture().catch(() => {
          this.copyStreamLink();
        });
      }
    } else {
      this.copyStreamLink();
    }
  }

  public copyStreamLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.displayToast('📋 Enlace copiado al portapapeles');
    }).catch(() => {
      this.displayToast('📋 Enlace: ' + url);
    });
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.clearConnectionTimeout();
    this.clearRetryTimeout();
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.destroyHls();
    if (this.videoPlayerRef?.nativeElement) {
      this.videoPlayerRef.nativeElement.pause();
      this.videoPlayerRef.nativeElement.src = '';
    }
  }

}
