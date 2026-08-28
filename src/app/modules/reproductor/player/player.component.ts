import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Item } from '../../../interfaces/m3u.response';
import { PlayerService } from '../../../services/player.service';
import Hls from 'hls.js';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css'],
  imports: [CommonModule]
})
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;
  
  private hls: Hls | null = null;
  public isLoading: boolean = true;
  public hasError: boolean = false;
  public errorMessage: string = '';
  public loadingMessage: string = 'Conectando con la señal en vivo...';

  public attempt: number = 1;
  public readonly MAX_ATTEMPTS: number = 3; // Reintentar hasta 3 veces
  public introKey: number = 1;

  private connectionTimeout: any = null;
  private retryTimeout: any = null;
  private readonly TIMEOUT_MS = 4500; // 4.5 segundos de espera activa por intento
  private readonly RETRY_DELAY_MS = 1800; // 1.8 segundos de pausa visible entre reintentos

  get canal(): Item {
    return this.playerService.selectedM3u;
  }

  get isIntro(): boolean {
    return !this.canal?.id || this.canal?.media_url === 'assets/movie.mp4';
  }

  constructor(private playerService: PlayerService,
              private route: ActivatedRoute,
              private router: Router,
              private cdr: ChangeDetectorRef,
              private ngZone: NgZone,
              private titleService: Title,
              private metaService: Meta) { }

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
  }

  ngAfterViewInit(): void {
    this.updateSeoMetadata(this.canal);
    this.loadMedia();
  }

  /**
   * Actualiza dinámicamente el título y metadatos SEO (OpenGraph, Description) según el canal activo.
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

    // Iniciar temporizador de 4.5s para este intento
    this.startConnectionTimeout();

    const isHls = mediaUrl.includes('.m3u8') || mediaUrl.includes('manifest') || !mediaUrl.endsWith('.mp4');

    if (isHls && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 4000,
        manifestLoadingMaxRetry: 0, // Controlamos los 3 intentos en nuestra capa
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
      // Safari / iOS nativo o MP4
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
          console.warn(`Timeout de conexión (${this.TIMEOUT_MS}ms) alcanzado en intento (${this.attempt}/${this.MAX_ATTEMPTS}) para:`, this.canal?.title);
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
      console.warn(`Pausa de ${this.RETRY_DELAY_MS}ms antes de intento ${this.attempt}/${this.MAX_ATTEMPTS} para:`, this.canal?.title);
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
    console.warn('Evento de error en elemento de video:', event);
    if (!this.hasError) {
      this.handleRetryOrError('Error en elemento de video');
    }
  }

  public retryPlayback(): void {
    this.loadMedia();
  }

  public playNextChannel(): void {
    const next = this.playerService.getNextChannel(this.canal?.id);
    if (next?.id) {
      this.playerService.getChannelById(next.id);
      this.router.navigate([next.id]);
    }
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  ngOnDestroy(): void {
    this.clearConnectionTimeout();
    this.clearRetryTimeout();
    this.destroyHls();
    if (this.videoPlayerRef?.nativeElement) {
      this.videoPlayerRef.nativeElement.pause();
      this.videoPlayerRef.nativeElement.src = '';
    }
  }

}
